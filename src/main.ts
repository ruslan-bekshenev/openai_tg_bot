import dotenv from 'dotenv'
import { Configuration, OpenAIApi } from 'openai'
import TelegramBot from 'node-telegram-bot-api'

dotenv.config()

const configuration = new Configuration({
  apiKey: process.env.CHAT_GPT_API_KEY,
})
const openai = new OpenAIApi(configuration)

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY ?? '', { polling: true })

const questionText = 'Задать вопрос'
const imageText = 'Изображения'
const endText = 'Завершить'
let currentProcess: string | null = null
async function generateImage(prompt: string) {
  return await openai.createImage({
    prompt,
    n: 4,
    size: '1024x1024',
  })
}

bot.onText(/\/start/, (msg, match) => {
  const chatId = msg.chat.id
  bot.sendMessage(chatId, 'Welcome', {
    reply_markup: {
      keyboard: [[{ text: questionText }], [{ text: imageText }]],
    },
  })
})

bot.onText(/\/q (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const resp = match?.[1]
  try {
    const completion = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: resp,
      temperature: 0.7,
      max_tokens: 2500,
      top_p: 1.0,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
      stop: ['\n+'],
    })
    completion.data?.choices?.forEach(({ text }) => {
      bot.sendMessage(chatId, text ?? '')
    })
  } catch (error: any) {
    if (error.response) {
      console.log(error.response.status)
      console.log(error.response.data)
    } else {
      console.log(error.message)
    }
  }
})

bot.onText(/\/img (.+)/, async (msg, match) => {
  const chatId = msg.chat.id
  const resp = match?.[1]
  try {
    const response = await generateImage(resp ?? '')
    response.data?.data?.forEach(({ url }) => {
      bot.sendMessage(chatId, url ?? '')
    })
  } catch (error: any) {
    if (error.response) {
      console.log(error.response.status)
      console.log(error.response.data)
    } else {
      console.log(error.message)
    }
  }
})

bot.on('message', async (msg) => {
  if (msg.text === questionText) {
    bot.sendMessage(msg.chat.id, 'Вы можете задать любой вопрос', {
      reply_markup: {
        remove_keyboard: true,
      },
    })
    currentProcess = 'text'
  }
  if (msg.text === imageText) {
    bot.sendMessage(msg.chat.id, 'Введите запрос для генерации изображения')
    currentProcess = 'image'
  }

  if (msg.text === endText) {
    currentProcess = null
    bot.sendMessage(msg.chat.id, 'Для того чтобы продолжить взаимодействовать с ботом напишите /start', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Завершить', callback_data: 'end' }]],
      },
    })
  }

  if (msg.text !== questionText) {
    if (currentProcess === 'text') {
      const chatId = msg.chat.id
      try {
        const completion = await openai.createCompletion({
          model: 'text-davinci-003',
          prompt: msg.text,
          temperature: 0.7,
          max_tokens: 2500,
          top_p: 1.0,
          frequency_penalty: 0.2,
          presence_penalty: 0.2,
          stop: ['\n+'],
        })
        let fullText = ''
        completion.data?.choices?.forEach(({ text }) => {
          fullText += text + ' '
        })

        bot.sendMessage(chatId, fullText, {
          reply_markup: {
            inline_keyboard: [[{ text: 'Завершить', callback_data: 'end' }]],
          },
        })
      } catch (error: any) {
        if (error.response) {
          console.log(error.response.status)
          console.log(error.response.data)
        } else {
          console.log(error.message)
        }
      }
    }
  }
})
