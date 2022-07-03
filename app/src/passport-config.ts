import { Strategy } from 'passport-http-bearer';

export function passportConfig (passport: any) {
    const authenticateUser = (token: any, done: any) => {
        if (token == 'mylogtoken') {
            return done(null, { username: 'system.admin' }, { scope: 'all' });
        }
        else {
            return done(null, false);
        }
    };

    console.log('Initalize Passport...');

    passport.use('bearer', new Strategy(authenticateUser));   
}