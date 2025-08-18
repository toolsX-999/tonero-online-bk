const mongoose = require("mongoose");
const localMongo = "mongodb://127.0.0.1:27017/bankDB";
const cloudMongo = "mongodb+srv://toolsx999:umWSx1oS7bM0e5Ni@cluster0.pq2pers.mongodb.net/toneroBkDb";
const mongoUri = cloudMongo;

const connectMongo = () => {
    mongoose.connect(mongoUri)
        .then(() => console.log("Mongodb connected successfully")
        )
        .catch((err) => console.log("Mongodb connection error", err)
        );
}

module.exports = connectMongo;

