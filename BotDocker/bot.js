let TelegramBot = require('node-telegram-bot-api');
let argon2 = require('argon2');
const { Web3 } = require("web3");
let abi = require('./abi.json');

var PROVIDER = "https://rpc2.sepolia.org/" // I've also tried 30303

// This line establishes a connection instance
const web3 = new Web3(PROVIDER);
const token = '7902551174:AAExztQ-ifmyfMdRhtaipY-cH_YKWtkvkVU';
const bot = new TelegramBot(token, { polling: true });
const myContract = new web3.eth.Contract(abi, "0x72712969B36F0B31aa7900b517D63dD1488E8466");

let chatStatus = {}
let walletChats = {}

const getWalletForUser = async (username) => {
  let userAddr = await myContract.methods.userAddress(username.toLowerCase()).call();
  if (userAddr == "0x0000000000000000000000000000000000000000") {
    throw({});
  }

  return userAddr
}

const loginThisUser = async (username, tgId) => {
  // check chain for user
  // if exists, check hash of tgId
  let wallet = await getWalletForUser(username)
  console.log(wallet);
  let userData = await myContract.methods.userData(wallet).call();
  console.log(userData);
  if (userData.tgHash) {
    if (await argon2.verify(userData.tgHash, tgId)) {
      return wallet;
    } else {
      throw({})
    }
  } else {
    throw({});
  }
}

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const messageText = msg.text;
  const firstWord = messageText.split(' ')[0]

  if (chatStatus[chatId]?.entryMode) {
    switch (chatStatus[chatId].entryMode) {
      case '/start':
        console.log(msg)
        loginThisUser(messageText, msg.from.username).then(walletId => {
          chatStatus[chatId].walletId = walletId;
          chatStatus[chatId].myName = messageText;
          walletChats[walletId] = chatId;
          chatStatus[chatId].entryMode = "";
          bot.sendMessage(chatId, 'You\'re logged in! Type /chat to start a chat');
        }).catch(error => {
          bot.sendMessage(chatId, 'Unable to login, please check that your ChainedIn username is correct & try re-entering your Telegram ID to the web platform');
        })
      break;
      case '/chat':
        getWalletForUser(messageText).then(walletId => {
          if (walletChats[walletId]) {
            bot.sendMessage(chatId, `Chat initiated with ${messageText}, reply to this message to send a message to ${messageText}. In the future, use the reply function on their messages to continue messaging them.`).then(result => {
              chatStatus[chatId].messages[result.message_id] = walletId;
            })
          } else {
            bot.sendMessage(chatId, `User ${messageText} has not logged in to the the ChainedIn bot. Please try again later`);
          }
        }).catch(() => {
          bot.sendMessage(chatId, `User ${messageText} was not found, please check their ChainedIn username and try again`);
        })
        chatStatus[chatId].entryMode = "";
      break;
    }
    return;
  }

  switch(firstWord) {
    case '/start':
      if (chatStatus[chatId] == undefined) {
        bot.sendMessage(chatId, 'Welcome to the ChainedIn bot! Please type your ChainedIn username to login');
      } else {
        walletChats[walletId] = undefined
        chatStatus[chatId] = undefined
        bot.sendMessage(chatId, 'You\'ve been logged out! Please type your ChainedIn username to login');
      }
      chatStatus[chatId] = {entryMode: firstWord, messages: {}};
    break;
    case '/chat':
      if (chatStatus[chatId] == undefined) {
        bot.sendMessage(chatId, 'Please type /start to login');
      } else {
        bot.sendMessage(chatId, 'Enter the ChainedIn username of a user you\'d like to chat with');
        chatStatus[chatId].entryMode = firstWord;
      }
    break;
    default:
      if (!chatStatus[chatId]) {
        bot.sendMessage(chatId, 'You\'re not logged in, please type /start to begin');
      } else {
        if (msg.reply_to_message?.message_id) {
          const otherWallet = chatStatus[chatId].messages[msg.reply_to_message.message_id];
          console.log(chatStatus[chatId])
          if (otherWallet) {
            bot.sendMessage(walletChats[otherWallet], `${chatStatus[chatId].myName} said:\n${messageText}`).then(result => {
              chatStatus[walletChats[otherWallet]].messages[result.message_id] = chatStatus[chatId].walletId;
            })
          }
        } else {
          bot.sendMessage(chatId, 'Either reply to another user\'s message or type /chat to start a new chat');
        }
      }
  }
});