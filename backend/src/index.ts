import { App } from '@tinyhttp/app'
import { Encoding } from 'o1js'
import  { Token } from 'xane'
import { Database } from './database'

const database = new Database()

const app = new App()

app.get('/', (_req, res) => {
    const fields = Encoding.stringToFields('hello world')
    const message = Encoding.stringFromFields(fields)

    console.log(Token)
    
    res.send(message)
})

app.listen(3000, () => console.log('Started on http://localhost:3000'))
