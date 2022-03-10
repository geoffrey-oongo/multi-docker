const keys = require("./keys")


//Express app setup
const express = require("express")
const bodyParser = require("body-parser")
const cors = require('cors')


const app = express()
app.use(cors())
app.use(bodyParser.json())


//Postgress client setup
const {Pool} =require("pg")
const pgClient = new Pool({
    user :keys.pgUser,
    host :keys.pgHost,
    database : keys.pgDatabase,
    password : keys.pgPassword,
    port : keys.pgPort,


})
pgClient.on("error", ()=>console.log("Lost pg connection"))
pgClient.query('CREATE TABLE IF NOT EXISTS values (number int)').catch(err=>console.log(err))

//Redis client setup 
const redis = require("redis")
const redisClient = redis.createClient({
    host :keys.redisHost,
    port : keys.redisPort,
    retry_strategy :()=>1000
})

const redisPublisher = redisClient.duplicate()

//Express route handlers 
app.get("/api/values/all",async(req, res, next)=>{
    const values = await pgClient.query('SELECT * FROM values')
    res.status(200).send({message :"success", result : values.rows})
})

app.get("/api/values/current", (req, res, next)=>{
    redisClient.hgetall('values', (err, values)=>{
        res.status(200).json({message : "success", values : values})
    })
})

app.post('/api/values', async(req, res, next)=>{

    const index = req.body.index
    if(parseInt(index)>40){
        return res.status(422).send('Too high')
    }
    redisClient.hset('values', index, 'Nothing yet')
    redisPublisher.publish('insert', index)
    pgClient.query("INSERT INTO values(number) VALUES($1)", [index])

res.status(200).json({"working":true})
})
app.listen(5000, err=>{
    console.log("listening")
})