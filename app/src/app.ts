import express, { Application, Request, Response, NextFunction } from 'express';
import mongodb, { MongoClient } from 'mongodb';
import passport from 'passport';
import fs from 'fs';
import path from 'path';

import { passportConfig } from './passport-config';
passportConfig(passport);

const mongoEnabled: boolean = true;
const mongoUrl: string = 'mongodb://admin:password@localhost:27017';
const mongoCollection: string = 'logs';
const mongoClient: MongoClient = new MongoClient(mongoUrl);

const app: Application = express();
const logFolderPath: string = '/data/logfiles';

app.get('/', (req: Request, res: Response, next: NextFunction) => {
    res.send('Hello')
});

app.get('/api/files', passport.authenticate('bearer', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
    const filterType:any = req.query.type || 'error';

    try {
        if (!fs.existsSync(logFolderPath)) {
          fs.mkdirSync(logFolderPath);
        }

        if (mongoEnabled) {
            let client = await mongoClient.connect();
            let db = client.db(mongoCollection);
        
            db.collection('audits').insertOne({
                date: new Date().toISOString(),
                method: 'get',
                action: 'files'
            });
        }
    } catch (err) {
        console.error(err);
    }

    let fileNames = fs.readdirSync(logFolderPath)
        .map(fileName => ({
            name: fileName,
            time: fs.statSync(`${logFolderPath}/${fileName}`).mtime.getTime()
        }))
        .filter(filter => {
            return filter.name.toLowerCase().indexOf(filterType) > 0
        })
        .sort((a, b) => b.time - a.time)
        .map(file => file.name);

    res.send(fileNames);
});

app.get('/api/logs', passport.authenticate('bearer', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
    const filterType:any = req.query.type || 'error';
    const filterFile:any = req.query.filename || '';

    try {
        if (!fs.existsSync(logFolderPath)) {
          fs.mkdirSync(logFolderPath);
        }

        if (mongoEnabled) {
            let client = await mongoClient.connect();
            let db = client.db(mongoCollection);
        
            db.collection('audits').insertOne({
                date: new Date().toISOString(),
                method: 'get',
                action: 'logs'
            });
        }
    } catch (err) {
        console.error(err);
    }

    let fileNames = fs.readdirSync(logFolderPath)
        .map(fileName => ({
            name: path.join(logFolderPath, fileName),
            time: fs.statSync(`${logFolderPath}/${fileName}`).mtime.getTime()
        }))
        .filter(filter => {
            if (filterFile != '') {
                return filter.name.toLowerCase().indexOf(filterFile.toLowerCase()) > 0;
            }
            else {
                return filter.name.toLowerCase().indexOf(filterType.toLowerCase()) > 0;
            }
        })
        .sort((a, b) => b.time - a.time)
        .map(file => file.name);

    let result = [];
    if (fileNames.length > 0) {
        let fileName = fileNames[0];
        const fileContent = fs.readFileSync(fileName, 'utf8');

        const contentRegex = new RegExp(/(([0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{4}))/g);
        var matchingResult = fileContent.split(contentRegex);

        var contentLength = matchingResult.length;
        var current = 1;
        while (current < contentLength){
            var traceData = matchingResult[current + 2];
            if (traceData != undefined) {
                var dataSplit = traceData.split('\r\n');
                result.push({
                    currentDate: matchingResult[current + 1],
                    errorId: (dataSplit[0] || '').replace(/ErrorId:/, ''),
                    message: (dataSplit[1] || '').replace(/Message:/, ''),
                    data: (dataSplit[2] || '').replace(/Data:/, ''),
                    exception: (dataSplit[3] || '').replace(/ Exception:/, '')
                });
            }
            
            current += 3;
        }
    }

    res.send(result);
});

app.get('/api/audits', passport.authenticate('bearer', { session: false }), async (req: Request, res: Response, next: NextFunction) => {
    let result: any;

    try {
        if (mongoEnabled) {
            let client = await mongoClient.connect();
            let db = client.db(mongoCollection);
        
            result = await db.collection('audits').find({}).toArray();
        }
    } catch (err) {
        console.error(err);
    }

    res.send(result);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Listening on port ${port}...`));