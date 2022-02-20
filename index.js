const Discord = require('discord.js');
const mongoose = require('mongoose');
const fs = require('fs');
const dclient = new Discord.Client();
const Schema = mongoose.Schema;

const userSchema = new Schema({
    _id: Number,
    voicechannel: { type: String },
    flags: {type: String },
    locale: { type: String },
    status: { type: String, required: true},
    presence: { type: Array },
    tag: { type: String, required: true },
    avatarURL: { type: String, required: true },
    created: { type: Date, required: true }
}, {timestamps: true});

const botSchema = new Schema({
    _id: Number,
    status: { type: String, required: true},
    newstatus: { type: String},
    tag: { type: String, required: true },
    created: { type: Date, required: true }
}, {timestamps: true});

const MUser = mongoose.model('User', userSchema);
const MBot = mongoose.model('Bot', botSchema);

var config_token = process.env.TOKEN
var config_prefix = process.env.PREFIX
var config_owner = process.env.OWNER
var config_channel = process.env.CHANNEL
process.env.TZ = "UTC"

if(process.argv.slice(2) == "test") {
    var secret = fs.readFileSync('secret', 'utf8').split(/\r?\n/)
    secret.forEach(function(line) {
        line = line.split("=")
        var name = line[0]
        var value = line[1]
        str = name+' = '+value;
        eval(str)
    })
}

dclient.on('ready', async () => {
    await dclient.user.setStatus("online")
    await mongoose.connect(`mongodb://${db_user}:${db_pass}@${db_host}:${db_port}/${db_name}`, {useNewUrlParser: true, useUnifiedTopology: true})
    await console.log(`Online`)
})

var cmdmap = {
    voice_find: cmd_voice_find,
    voice_list: cmd_voice_list,

    user_avatar: cmd_user_avatar,
    user_raw: cmd_user_raw,

    bot_status: cmd_bot_status
}

async function cmd_voice_find(msg, args) {
    const id = await args[0]
    const voicechannel = await MUser.findById(id).voicechannel
    var channel
    var guild
    if(voicechannel != null) {
        const channell = await dclient.channels.cache.get(voicechannel)
        channel = channell.name
        guild = channell.guild.name
    } else {
        channel = undefined
        guild = undefined
    }
    dclient.channels.cache.get(config_channel).send("Channel Name: " + channel + "\nChannel id: " + voicechannel + "\nGuild Name: " + guild)
}

async function cmd_voice_list(msg, args) {
    const id = await args[0]
    var users = []
    if(id != null) {
        const channell = await dclient.channels.cache.get(id)
        userss = await channell.members
        userss.forEach(function(user) {
            users.push(user.user.tag)
        })
        dclient.channels.cache.get(config_channel).send("Users: " + users.join("; "))
    } else {
        dclient.channels.cache.get(config_channel).send("No channel id provided")
    }
}

async function cmd_user_avatar(msg, args) {
    const id = await args[0]
    var user = await MUser.findById(id)
    if(user == null || undefined) {dclient.channels.cache.get(config_channel).send("404 Not Found"); return false}
    dclient.channels.cache.get(config_channel).send(user.avatarURL)
}

async function cmd_user_raw(msg, args) {
    const id = await args[0]
    var user = await MUser.findById(id)
    if(user == null || undefined) {dclient.channels.cache.get(config_channel).send("404 Not Found"); return false}
    dclient.channels.cache.get(config_channel).send(user.toString())
}

async function cmd_bot_status(msg, args) {
    var bott = await MBot.findById(args[0])
    var newstatus = null
    if(bott == null || bott == undefined) {dclient.channels.cache.get(config_channel).send("404 Not Found"); return false}
    if(args[1] == "online") {
        newstatus = "online"
        dclient.channels.cache.get(config_channel).send("bot status changed to online")
    } else if(args[1] == "idle") {
        newstatus = "idle"
        dclient.channels.cache.get(config_channel).send("bot status changed to idle")
    } else if(args[1] == "dnd") {
        newstatus = "dnd"
        dclient.channels.cache.get(config_channel).send("bot status changed to dnd")
    } else if(args[1] == "offline") {
        newstatus = "offline"
        dclient.channels.cache.get(config_channel).send("bot status changed to offline")
    } else {
        dclient.channels.cache.get(config_channel).send("Invalid status")
    }
    const bot = new MBot({
        newstatus: newstatus,
    })
    bot._id = Number(args[0])
    await MBot.findByIdAndUpdate({_id: bot._id}, bot, {upsert: true})
}

dclient.on('message', (msg) => {
    if(msg.author.id == dclient.user.id) { return false}
    if(msg.author.id != config_owner) { return false }
    if(msg.channel.id != config_channel) { return false }
    if(msg.content.startsWith(config_prefix)) {
        var invoke = msg.content.split(' ')[0].substr(config_prefix.length)
        var args   = msg.content.split(' ').slice(1)
        if (invoke in cmdmap) {
            if (cmdmap[invoke](msg, args) == false) {
                console.log("ERROR")
            }
        }
    }
})

dclient.login(config_token);