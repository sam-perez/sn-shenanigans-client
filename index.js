const Client = require('instagram-private-api').V1;
const storage = new Client.CookieMemoryStorage();
const co = require('co');
const bluebird = require('bluebird');
const axios = require('axios');

const MAX_NUMBER_REQUESTS_PER_USER = 10;
const MIN_NUMBER_REQUESTS_PER_USER = 1;

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min) + min);
const getRandomNumberRequests = () => getRandomInt(MIN_NUMBER_REQUESTS_PER_USER, MAX_NUMBER_REQUESTS_PER_USER);

const MAX_RANDOM_WAIT = 10000; // 15 seconds
const MIN_RANDOM_WAIT = 3000; // 5 seconds

const getRandomWait = () => getRandomInt(MIN_RANDOM_WAIT, MAX_RANDOM_WAIT);

const MAX_RANDOM_LOGIN_WAIT = 3000;
const MIN_RANDOM_LOGIN_WAIT = 1000;

const getLoginWait = () => getRandomInt(MIN_RANDOM_LOGIN_WAIT, MAX_RANDOM_LOGIN_WAIT);

const getNextUser = (() => {
    const USERS = [
        {
            username: 'sp_sn_1',
            password: '0ZrahuMMui9B'
        },
    ];

    let currentuser = -1;
    return () => {
        currentuser++;
        if (currentuser >= USERS.length) { currentuser = 0; }

        return USERS[currentuser];
    };
})();

const redisservice = (() => {
    /*
    const redis = require("redis")
    bluebird.promisifyall(redis.redisclient.prototype);
    const Client = redis.createclient();
    */

    return {
        getnextidtocrawl: co.wrap(function*() {
            return 1518023607;
            //return yield Client.spopasync('ig_account_ids');
        }),
        saveresult: co.wrap(function*(result) {
            //return yield Client.hsetasync('results', result.id, json.stringify(result));
            console.log(result);
        })
    };
})();


const crawlnextaccounts = co.wrap(function*() {
    let accountslefttocrawl = getRandomNumberRequests();

    const {username, password} = getNextUser();

    try {
        const device = new Client.Device(username);
        const session = yield Client.Session.create(device, storage, username, password);

        console.log('logged in, waiting to make ' + accountslefttocrawl + ' requests...');
        yield bluebird.Promise.delay(getLoginWait());

        while(accountslefttocrawl-- > 0) {
            let nextid = yield redisservice.getnextidtocrawl();
            if (!nextid) {
                return null;
            }
            console.log('about to crawl: ' + nextid);
            let useraccount = yield Client.Account.getById(session, nextid);
            yield redisservice.saveresult(useraccount._params);

            console.log('waiting before next request');
            yield bluebird.Promise.delay(getRandomWait());
        }
    } catch (err) {
        console.log('something is wrong...');
        console.log(err);
    }

    return true;
});

const parallelism = 2;

const kickoff = co.wrap(function*() {
    while (true) {
        try {
            yield (Array.apply(0, Array(parallelism)).map((val) => crawlnextaccounts()));
            console.log('finished a set, continuing...');
        } catch (err) {
            console.log('error while executing a set');
            console.log(err);
            break;
        }
    }

    console.log('done!');
});

kickoff().then(() => console.log('woot'));

/*
    hash.fullname = json.fullname;
    hash.isprivate = json.isprivate;
    hash.isbusiness = json.isbusiness;
    hash.biography = json.biography;
    hash.externalurl = json.externalurl;
    hash.external_url = json.external_url;
    hash.public_email = json.public_email;
    hash.public_phone_number = json.public_phone_number;
    hash.contact_phone_number = json.contact_phone_number;
    hash.city_name = json.city_name;
    hash.zip = json.zip;
    hash.address_street = json.address_street;
    hash.latitude = json.latitude;
    hash.longitude = json.longitude;
*/
