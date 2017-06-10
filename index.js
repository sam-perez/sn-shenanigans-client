const Client = require('instagram-private-api').V1;
const storage = new Client.CookieMemoryStorage();
const co = require('co');
const bluebird = require('bluebird');
const argv = require('optimist').argv;
const {getInstagramUsers, createUserCycler} = require('./backend_service');

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

if (argv.getUsers) {
    getInstagramUsers().then((users) => {
        console.log('The following users have been assigned to your machine:');
        console.log(JSON.stringify(users, null, 4));
    });
} else {
    kickoff().then(() => console.log('woot'));
}
