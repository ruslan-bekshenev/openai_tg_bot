import dotenv from 'dotenv'
import { Configuration, OpenAIApi } from 'openai'
import TelegramBot from 'node-telegram-bot-api'
import fs from 'fs'
import axios from 'axios'
import sharp from 'sharp'
import path from 'path'

dotenv.config()

const configuration = new Configuration({
  apiKey: process.env.CHAT_GPT_API_KEY,
})
const openai = new OpenAIApi(configuration)

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY ?? '', { polling: true })

async function generateImage(prompt: string) {
  return await openai.createImage({
    prompt,
    n: 1,
    size: '1024x1024',
  })
}

async function generateEditImage(content: any) {
  console.log(content)
  // return await openai.createImageVariation({
  //   model: 'image-alpha-001',
  //   prompt: 'Anime',
  //   n: 1,
  //   image: {
  //     n: 1,
  //     content,
  //     mime_type: 'image/jpeg',
  //     size: '1024x1024',
  //   },
  // })
}

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

    console.log(completion.data.choices)

    bot.sendMessage(chatId, completion.data?.choices?.[0]?.text ?? '')
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
  console.log('test')
  console.log
  const chatId = msg.chat.id
  const resp = match?.[1]
  console.log(resp)
  try {
    const response = await generateImage(resp ?? '')
    bot.sendMessage(chatId, response.data.data[0].url ?? '')
  } catch (error: any) {
    if (error.response) {
      console.log(error.response.status)
      console.log(error.response.data)
    } else {
      console.log(error.message)
    }
  }
})

bot.on('photo', async (msg) => {
  let photo = ''
  try {
    const rs = fs.createReadStream(process.cwd() + '/src/cat.png', { encoding: 'base64' })
    rs.on('data', async (data) => {
      photo = data as string
    })
    const response = await openai.createImage({
      prompt: `Камчатский суслик после работы`,
      n: 4,
      size: '256x256',
    })
    console.log(response.data.data)
  } catch (error: any) {
    if (error.response) {
      console.log(error.response.status)
      console.log(error.response.data)
    } else {
      console.log(error.message)
    }
  }
})
