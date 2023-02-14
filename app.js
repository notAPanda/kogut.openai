import fs from "fs";
import csv from "csv-parser";
import _ from "lodash";
import { OpenAIApi, Configuration } from "openai";
import dotenv from "dotenv";

dotenv.config();

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(config);

const prompt = (topic, keywords) => {
  return `Proszę o napisanie unikalnego artykułu o długości przynajmniej 1500 słów, zoptymalizowanego pod kątem SEO, na temat "${topic}". Artykuł powinien zawierać następujące słowa kluczowe: [${keywords}], słowa kluczowe muszą się powtarzać przynajmniej 3 razy i powinien być napisany w stylu informacyjno-edukacyjnym. Prosimy o uwzględnienie najnowszych wytycznych dotyczących optymalizacji treści pod kątem wyszukiwarek. Tekst ma być sformatowany do HTML - tytuł umieść w znaczniku  <h1>, nagłówki w znaczniku <h2>, akapity w znaczniku <p>, zastosuj pogrubienia słów kluczowych używając znacznika <b>.`;
};

console.log("Initialized");

const createContent = (topic, keywords) => {
  return openai
    .createCompletion({
      model: "text-davinci-002",
      prompt: prompt(topic, keywords),
      temperature: 1,
      max_tokens: 2048,
      top_p: 0,
    })
    .then((response) => {
      return {
        topic: topic,
        text: _.get(response, "data.choices[0].text"),
      };
    });
};

const saveToFile = (row) => {
  if (!fs.existsSync("./output")) {
      fs.mkdirSync("./output");
  }
  fs.writeFile(`./output/${_.snakeCase(row.topic)}.html`, row.text, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(`file ready: ${_.snakeCase(row.topic)}.html`);
  });
};

const processErrors = (error) => {
  let message = _.get(error, "response.statusText");
  if (message) {
    return console.log({
      status: "error",
      message: message,
    });
  }

  console.log(error);
};

const processContent = (row) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      console.log("generating: " + row.topic);
      createContent(row.topic, row.keywords)
        .then(saveToFile)
        .then(resolve)
        .catch(processErrors);
    }, 1 * 1000);
  });
};

const processFileData = (fileData) => {
  fileData.reduce((previousPromise, row) => {
    return previousPromise.then(() => {
      return processContent(row);
    });
  }, Promise.resolve());
};

const fileData = [];

fs.createReadStream("./data.csv")
  .pipe(csv())
  .on("data", (row) => {
    fileData.push(row);
  })
  .on("end", () => {
    processFileData(fileData);
  });
