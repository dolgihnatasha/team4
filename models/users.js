'use strict';

const crypto = require('crypto');

let usersCollection;
let salt = 'dreamTeam';

const errors = {
    nameExist: {
        code: 1,
        message: 'Имя уже существует'
    },
    mongoError: {
        code: 2,
        message: 'Ошибка Mongo'
    },
    wrongData: {
        code: 1,
        message: 'Неверные логин/пароль'
    }
};

function getHash(password) {
    return crypto
        .createHmac('sha256', salt)
        .update(password.toString())
        .digest('hex');
}

const login = user => {
    return new Promise((resolve, reject) => {
        user.password = getHash(user.password);
        usersCollection.find({email: user.email}).toArray((err, result) => {
            if (err) {
                reject(errors.mongoError);
            }
            if (result.length) {
                resolve(result[0]);
            } else {
                reject(errors.wrongData);
            }
        });
    });
};

const addUser = newUser => {
    return new Promise((resolve, reject) => {
        isNameExist(newUser.name).then(
            exist => {
                if (exist) {
                    reject(errors.nameExist);
                }
                newUser.password = getHash(newUser.password);
                usersCollection.insertOne(newUser, err => {
                    if (err) {
                        reject(errors.mongoError);
                    }
                    resolve();
                });
            },
            () => reject(errors.mongoError)
        );
    });
};

function isNameExist(newName) {
    return new Promise((resolve, reject) => {
        usersCollection.find({name: newName}).toArray((err, result) => {
            if (err) {
                reject(err);
            }
            resolve(result.length);
        });
    });
}

const operations = {
    addUser: newUser => addUser(newUser),
    login: user => login(user)
};

module.exports = db => {
    usersCollection = db.collection('users');
    return operations;
};