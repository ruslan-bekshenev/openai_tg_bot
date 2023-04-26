import dotenv from 'dotenv'
import { Configuration, OpenAIApi } from 'openai'
import TelegramBot from 'node-telegram-bot-api'
import { INLINE_MENU } from './constant/index.js'

dotenv.config()

const configuration = new Configuration({
  apiKey: process.env.CHAT_GPT_API_KEY,
})
const openai = new OpenAIApi(configuration)

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY ?? '', { polling: true })

let currentProcess: string | null = null

async function generateImage(prompt: string) {
  return await openai.createImage({
    prompt,
    n: 4,
    size: '1024x1024',
  })
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  bot.sendMessage(chatId, 'Добро пожаловать! Выберите категорию.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: INLINE_MENU.question.name, callback_data: INLINE_MENU.question.value }],
        [{ text: INLINE_MENU.image.name, callback_data: INLINE_MENU.image.value }],
      ],
    },
  })
})

bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message
  currentProcess = callbackQuery?.data !== 'end' ? callbackQuery?.data ?? null : null
  bot
    .answerCallbackQuery(callbackQuery.id)
    .then(() =>
      bot.sendMessage(
        msg?.chat?.id ?? '',
        currentProcess === 'question'
          ? 'Можете задать любой вопрос'
          : currentProcess === 'image'
          ? 'Введите описание, бот нарисует для вас изображение. Описание лучше вводить на английском языке'
          : 'Для того, чтобы взаимодействовать с ботом введите команду /start',
      ),
    )
})

bot.on('message', async (msg) => {
  const chatId = msg.chat.id
  console.log(currentProcess)
  if (currentProcess === 'question') {
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

      bot.sendMessage(chatId, completion.data?.choices?.[0]?.text ?? '', {
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
  if (currentProcess === 'image') {
    try {
      const response = await generateImage(msg?.text ?? '')
      response.data?.data?.forEach(({ url }) => {
        bot.sendMessage(chatId, url ?? '')
      })
    } catch (error: any) {
      if (error.response) {
        console.log(error.response.status)
        console.log(error.response.data)
        if (error.response.data.error.code === 'rate_limit_exceeded') {
          bot.sendMessage(chatId, 'Достигнут лимит для генерации изображений, подождите 1 минуту')
        }
        if (error.response.status === 400) {
          bot.sendMessage(chatId, 'Некорректный запрос')
        }
      } else {
        console.log(error.message)
      }
    }
  }
})
