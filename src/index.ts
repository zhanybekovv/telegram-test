import { UPDATE } from '@airgram/constants'
import { useModels } from '@airgram/use-models'
import { Airgram, Auth, isError, prompt } from 'airgram'
import debug from 'debug'
import ChatModel from './ChatModel'
import { Store } from './Store'
const writeLog = debug('airgram:log')
const writeError = debug('airgram:error')

const store = new Store()

let chatId = 537422699;

const airgram = new Airgram({
  apiHash: process.env.APP_HASH!,
  apiId: Number(process.env.APP_ID!),
  command: process.env.TDLIB_COMMAND,
  logVerbosityLevel: 2,
  models: useModels({
    chat: ChatModel
  }),
  context: { $store: store }
})

airgram.use(new Auth({
  code: () => prompt(`Please enter the secret code:\n`),
  phoneNumber: async () => process.env.PHONE_NUMBER || prompt(`Please enter your phone number:\n`)
}))

// Get current user
airgram.api.getMe().then((me) => {
  console.log(`[Me] `, JSON.stringify(me))
}).catch((error) => {
  console.error(error)
})

// Save users to the store
airgram.on(UPDATE.updateUser, async ({ $store, update }, next) => {
  const { user } = update
  $store.users.set(user.id, user)
  return next()
})

// Save chats to the store
airgram.on(UPDATE.updateNewChat, async ({ $store, update }, next) => {
  const { chat } = update
  $store.chats.set(chat.id, chat)
  return next()
})

// Save last messages to the store
airgram.on(UPDATE.updateChatLastMessage, async ({ $store, update }, next) => {
  $store.chatLastMessage.set(update.chatId, update)
  return next()
})

airgram.api.getChats({
  limit: 1,
  offsetChatId: 0,
  offsetOrder: '9223372036854775807' // 2^63
}).then(({ response, $store }) => {
  if (isError(response)) {
    throw new Error(`[TDLib][${response.code}] ${response.message}`)
  }
  console.log("IDS", response.chatIds)
  const chats = response.chatIds.map((chatId) => {
    const chat = $store.chats.get(chatId)
    airgram.api.getChatHistory({
      chatId: chatId, 
      fromMessageId: 0,
      limit: 10
    }).then(({response}) => {
      if (isError(response)) {
        throw new Error(`[TDLib][${response.code}] ${response.message}`)
      }
      const res = response.messages && response.messages[0]
      const message = $store.chatLastMessage.get(chatId)
      if (!chat || !message || !message.lastMessage) {
        throw new Error('Invalidate store')
      }
      const { lastMessage } = message
      const sentBy = $store.users.get(lastMessage.senderUserId)
      console.log("SENDER", sentBy)
      })

    const message = $store.chatLastMessage.get(chatId)

    if (!chat || !message || !message.lastMessage) {
      throw new Error('Invalidate store')
    }

    const { lastMessage } = message
    const { title } = chat
    const sentBy = $store.users.get(lastMessage.senderUserId)
    return {
      title,
      lastMessage: lastMessage.content,
      sentBy,
      chatId
    }
  })

  writeLog('getChats:')
  writeLog(chats)
}).catch(writeError)

// -title: 'Mrazi – Challengeboard',
// airgram:log     lastMessage: { _: 'messageText', text: [Object] },
// airgram:log     sentBy: undefined,
// airgram:log     chatId: -537422699


// airgram.api.getChatHistory({
//   chatId: -1001173868607,
//   fromMessageId: 0,
//   limit: 10
// }).then(({response, _}) => {
//   if (isError(response)) {
//     throw new Error(`[TDLib][${response.code}] ${response.message} ${response._}`)
//   }
//   writeLog("[CHAT_HISTORY]", response)
// }).catch(writeError)

// Getting all updates
// airgram.use((ctx, next) => {
//   if ('update' in ctx) {
//     console.log(`[all updates][${ctx._}]`, JSON.stringify(ctx.update))
//   }
//   return next()
// })

// airgram.on(UPDATE.updateNewMessage, async ({ $store, update }) => {
//   const { message } = update
//   const chat = $store.chats.get(message.chatId)

//   if (!chat) {
//     throw new Error('Unknown chat')
//   }

//   console.log('[new message]', {
//     // chat: chat,
    
//     title: chat.title,
//     isBasicGroup: chat.isBasicGroup,
//     isSupergroup: chat.isSupergroup,
//     isPrivateChat: chat.isPrivateChat,
//     isSecretChat: chat.isSecretChat,
//     message: JSON.stringify(message)
//   })
// })
