import dotenv from 'dotenv'
import { Configuration, OpenAIApi } from 'openai';
import TelegramBot  from 'node-telegram-bot-api'
import fs from 'fs'
import request from 'request'

request.defaults({ encoding: null })

dotenv.config()

const configuration = new Configuration({
  apiKey: process.env.CHAT_GPT_API_KEY,
});
const openai = new OpenAIApi(configuration);

const bot = new TelegramBot(process.env.TELEGRAM_API_KEY ?? '', { polling: true })

async function generateImage(prompt: string) {
  return await openai.createImage({
    prompt,
    n: 1,
    size: "1024x1024",
  });
}

async function generateEditImage(data: any) {
  const file = Buffer.from(data, 'base64')
  return await openai.createImageVariation(file, 1, '1024x1024')
}

bot.onText(/\/q (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const resp = match?.[1];
  try {
    const completion = await openai.createCompletion({
      model: 'text-davinci-003',
      prompt: resp,
      temperature: 0.7,
      max_tokens: 2500,
      top_p: 1.0,
      frequency_penalty: 0.2,
      presence_penalty: 0.2,
      stop: ["\n+"],
    });
    
    console.log(completion.data.choices)
    
    bot.sendMessage(chatId,  completion.data?.choices?.[0]?.text ?? "");
  } catch (error: any) {
    if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data);
    } else {
        console.log(error.message);
    }
}
});

bot.onText(/\/img (.+)/, async (msg, match) => {
  console.log('test')
  console.log
  const chatId = msg.chat.id;
  const resp = match?.[1];
  console.log(resp)
  try {
    const response = await generateImage(resp ?? "");
    bot.sendMessage(chatId,  response.data.data[0].url ?? "");
  } catch (error: any) {
    if (error.response) {
        console.log(error.response.status);
        console.log(error.response.data);
    } else {
        console.log(error.message);
    }
}
})

bot.on('message', (msg) => {
  // bot.getFile()
  const { photo } = msg
  if (photo) {
    bot.getFileLink(photo[3]?.file_id).then(data => {
      request.get(data, async (err, res, body) => {
        const response = await generateEditImage(body)
        console.log(response)
      })
    })
  }
})