import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import axios from "axios";
require("dotenv").config();
import {CustomAlphabet, customAlphabet} from "nanoid";

// HEX
let nanoid = customAlphabet(
  "1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  4
);

mongoose.connect(
  process.env.MONGO_URI,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
  () => console.log("DB is connected...")
);

// Import URL model
import URL from "./models/Urls";

const PORT = process.env.PORT || 15205;
const whiteList = "https://lynko.netlify.app";

app = express();
app.use(
  cors({
    origin: whiteList,
  }) 
); // origin: * --> origin: mywebsite.com
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Home page",
  });
});

app.get("/urls", async (req, res, next) => {
  let urls = await URL.find({}).exec();
  res.json(urls);
});

app.post("/api/shorturl", async ({body}, res, next) => {
  if (body.url) {  
    try {
      let url = await URL.findOne({ originalUrl: body.url }).exec();

      if (url) {
        res.json({ short: `${process.env.URL}/${url.slug}`, status: 200 });
      } else {
        // make a request with Axios
        const response = await axios.get(body.url.toString(), {
          validateStatus: status => status < 500,
        });

        if (response.status != 404) {
          let newUrl;
          while (true) {
            let slug = nanoid();
            let checkedSlug = await URL.findOne({ slug }).exec();
            if (!checkedSlug) {
              newUrl = await URL.create({
                originalUrl: body.url,
                slug,
              });
              break;
            }
          }

          res.json({
            short: `${process.env.URL}/${newUrl.slug}`,
            status: response.status,
          });
        } else {
          res.json({
            message: response.statusText,
            status: response.status,
          });
        }
      }
    } catch (err) {
      next(err);
    }
  } else {
    res.status(400);
    const error = new Error("URL is required");
    next(error);
  }
});

app.get("/:slug", async ({params}, res, next) => {
  try {
    let url = await URL.findOne({ slug: params.slug }).exec();

    if (url) {
      res.status(301);
      res.redirect(url.originalUrl);
    } else {
      next();
    }
  } catch (err) {
    next(err);
  }
});

function notFound({originalUrl}, res, next) {
  res.status(404);
  const error = new Error(`Not found - ${originalUrl}`);
  next(error);
}

function errorHandler({message, stack}, req, res, next) {
  res.status(res.statusCode || 500);
  res.json({
    message,
    error: {
      status: res.statusCode,
      stack: process.env.ENV === "development" ? stack : undefined,
    },
  });
}

app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => console.log(`Listening on port ${PORT}...`));
