const express = require('express')
const app = express()
const { SerialPort } = require('serialport');
const ModbusMaster = require('modbus-rtu').ModbusMaster;
const { createServer } = require('http')
const { Server } = require('socket.io')
const cors = require('cors')

const httpServer = createServer(app)
const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
})
require('dotenv').config()

const serialPort = new SerialPort({
    path: 'COM10',
    baudRate: 9600
});

const master = new ModbusMaster(serialPort);
let datas = {
    detector_rasp: {
        mac: "RB-MONITOR",
        values: []
    }
}
let sensors = []
class sensor {
    constructor(nm, value, und, valid, status, msg, color, bgColor, borderColor, historical) {
        this.nm = nm
        this.value= value
        this.und = und
        this.valid = valid
        this.status = status
        this.msg = msg
        this.color = color
        this.bgColor = bgColor
        this.borderColor = borderColor
        this.historical = historical
    }
}
let historical = [[], [], [], []]
const nm = ['O2', 'NO2', 'CO2', 'CO']
const color = ['teal', 'yellow', 'cyan', 'orange']
const bgColor = ['rgba(0, 188, 212, 0.2)', 'rgba(255, 235, 59, 0.2)', 'rgba(66, 165, 245, 0.2)', 'rgba(255, 152, 0, 0.2)']
const borderColor = ['#00BCD4', '#FFEB3B', '#42A5F5', '#FF9800']
const unidades = ['mol', 'ppm', '%vol', '%LEL']
const status = ['ALERTA NIVEL BAJO', 'OK', 'ALERTA NIVEL ALTO', 'ALERTA NIVEL MUY ALTO']
let USERS = {}

io.on('connection', (socket) => {
        console.log('connected')
        USERS[socket.id] = socket
        socket.on('disconnect', () => {
                console.log('disconnected')
                delete USERS[socket.id]
        })
})
setInterval( async () => {
    // const s = [[Math.floor(Math.random() * 11),2,1,0,2], [Math.floor(Math.random() * 11),4,2,0,1]]
    for (let i = 1; i < 3; i++) {
        try {
            const data = await master.readHoldingRegisters(i, 0, 5)
            // const data = s[i-1]
            const value = data[0]/(10**(data[1]-2))
            historical[i].push(value)
            if (historical[i].length > 50) {
                historical[i].shift()
            }
            const item = new sensor(nm[i], value, unidades[data[2]], data[3], data[4], status[data[4]], color[i], bgColor[i], borderColor[i], historical[i])
            sensors.push(item)
        } catch(err) {
            console.log(err)
        }
    }
    console.log(sensors)
    for (let i in USERS) {
        USERS[i].emit('data', sensors)
    }
    sensors = []
}, 2000)

httpServer.listen(5000)
