'use strict';

const debug = require('debug')('team4:controllers:pages');

const questsModel = require('../models/quests');
const userModel = require('../models/users');
const randInt = require('../lib/random').randInt;
const fuzzy = require('fuzzysearch');

function filterFields(fields) {
    return obj => {
        let resObj = {};
        fields.forEach(field => {
            if (field === 'photo') {
                resObj[field] = getRandomPhoto(obj);
            } else if (obj.hasOwnProperty(field)) {
                resObj[field] = obj[field];
            }
        });
        return resObj;
    };
}

function getRandomPhoto(quest) {
    return quest.places[randInt(quest.places.length)].img;
}

exports.index = (req, res) => {
    debug('index');
    const quests = questsModel(req.db);
    let questNum = req.body.hasOwnProperty('skip') ? parseInt(req.body.skip, 10) : 0;
    let questLimit = req.body.hasOwnProperty('get') ? parseInt(req.body.get, 10) : 3;
    let filter = req.url === '/popular' ? 'likesCount' : '';
    quests.getLimitQuestsSorted(questNum, questLimit, filter).then(chosenQuests => {
        console.log(chosenQuests.map(filterFields(['title', 'likesCount'])));
        chosenQuests = chosenQuests.map(filterFields(['url', 'photo', 'title']));
        if (questNum === 0) {
            res.renderLayout('./pages/index/index.hbs',
                {quests: chosenQuests});
        } else {
            res.status(200).json({quests: chosenQuests});
        }
    });
};

exports.userPage = (req, res) => {
    debug('userPage');
    let users = userModel(req.db);
    let quests = questsModel(req.db);
    var response = {
        username: req.params.name
    };
    let user;
    users.isUserExist(req.params.name)
        .then(users => {
            if (users) {
                return req.params.name;
            }
            res.renderLayout('./pages/notFound/notFound.hbs');
            throw new Error('это как return, только следующий then не будет работать');
        })
        .then(users.getPublicUserData)
        .then(userInfo => {
            user = userInfo;
            let finished = user.finishedQuests;
            let inProcess = user.inProgressQuests;
            let created = user.createdQuests;
            return finished.concat(inProcess).concat(created);
        })
        .then(quests.getQuestsById)
        .then(questsInfo => {
            let finished = user.finishedQuests.forEach(quest => {
                return questsInfo.find(q => {
                    return q._id === quest;
                });
            }).map(filterFields(['title', 'photo', 'url']));
            let inProcess = user.inProgressQuests.forEach(quest => {
                return questsInfo.find(q => {
                    return q._id === quest;
                });
            }).map(filterFields(['title', 'photo', 'url']));
            let created = user.createdQuests.forEach(quest => {
                return questsInfo.find(q => {
                    return q._id === quest;
                });
            }).map(filterFields(['title', 'photo', 'url']));
            Object.assign(response, {finished, inProcess, created});
            res.renderLayout('./pages/userPage/userPage.hbs', response);
        })
        .catch(() => {
            res.status(500).renderLayout('./pages/notFound/notFound.hbs');
        });
};

exports.auth = (req, res) => {
    debug('auth');
    res.renderLayout('./pages/authorization/authorization.hbs');
};

exports.createQuest = (req, res) => {
    debug('createQuest');
    res.renderLayout('./pages/createQuest/createQuest.hbs');
};

exports.reg = (req, res) => {
    debug('reg');
    res.renderLayout('./pages/registration/registration.hbs');
};

exports.error404 = (req, res) => {
    debug('error404');
    res.status(404).renderLayout('./pages/notFound/notFound.hbs');
};

exports.getTitles = (req, res) => {
    debug('getTitles');
    questsModel(req.db)
        .getAllQuests()
        .then(quests => {
            res.status(200).json({quests: quests.map(quest => quest.title)});
        })
        .catch(err => {
            console.error(err);
            res.statusCode(500);
        });
};

exports.search = (req, res) => {
    debug('search');
    const quests = questsModel(req.db);
    const query = req.query.query;
    if (typeof query !== 'string') {
        res.end();
    }
    quests
        .getQuest(query)
        .then(quest => {
            if (quest) {
                res.redirect('/quest/' + quest.url);
                throw new Error('');
            }
        })
        .then(() => quests.getAllQuests())
        .then(quests => quests.filter(quest => {
            return fuzzy(query, quest.title);
        }))
        .then(quests => {
            console.log('count found quest ', quests.length);
            if (quests.length === 0) {
                res.status(404).renderLayout('./pages/notFound/notFound.hbs');
                throw new Error('');
            }
            return quests;
        })
        .then(quests => {
            const filteredQuests = quests
                .map(filterFields(['url', 'photo', 'title']))
                .slice(0, 10);
            res.renderLayout('./pages/index/index.hbs',
                {quests: filteredQuests});
        });
};
