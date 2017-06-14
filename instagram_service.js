const co = require('co');
const Client = require('instagram-private-api').V1;
const storage = new Client.CookieMemoryStorage();
const statusLog = require('single-line-log').stdout;
const bluebird = require('bluebird');

const MAX_NUMBER_REQUESTS_PER_USER = 10;
const MIN_NUMBER_REQUESTS_PER_USER = 1;

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min) + min);
const getRandomNumberRequests = () => getRandomInt(MIN_NUMBER_REQUESTS_PER_USER, MAX_NUMBER_REQUESTS_PER_USER);

const MAX_RANDOM_WAIT = 10000;
const MIN_RANDOM_WAIT = 3000;

const getRandomWait = () => getRandomInt(MIN_RANDOM_WAIT, MAX_RANDOM_WAIT);

const MAX_RANDOM_LOGIN_WAIT = 3000;
const MIN_RANDOM_LOGIN_WAIT = 1000;

const getLoginWait = () => getRandomInt(MIN_RANDOM_LOGIN_WAIT, MAX_RANDOM_LOGIN_WAIT);

const crawlNextAccounts = co.wrap(function*(getNextUser, getNextIdToCrawl, saveResult) {
    let accountslefttocrawl = getRandomNumberRequests();

    const user = getNextUser();

    if (user === undefined) {
        throw 'No healthy users left, ending this set.';
    }

    try {
        const session = yield createSessionWithUser(user);

        console.log(user.username + ' logged in, waiting to make ' + accountslefttocrawl + ' requests...');
        yield bluebird.Promise.delay(getLoginWait());

        while(accountslefttocrawl-- > 0) {
            let nextid = yield getNextIdToCrawl();
            if (!nextid) {
                console.log('Did not get an id to crawl...');
                return false;
            }
            console.log('about to crawl: ' + nextid);
            let useraccount = yield Client.Account.getById(session, nextid);
            yield saveResult(useraccount._params);

            console.log('waiting before next request');
            yield bluebird.Promise.delay(getRandomWait());
        }
    } catch (err) {
        console.log('something is wrong...');
        console.log(err);
        user.reportAsBad();
    }

    console.log(`${user.username} is done making requests`);
    return true;
});

const PARALLELISM = 2;
const EXECUTIONS_BETWEEN_LONG_SLEEP = 50;
const LONG_SLEEP_DURATION_IN_SECONDS = 60 * 30; // 30 min long sleep

exports.kickoff = co.wrap(function*(getInstagramUsers, createUserCycler, saveResult, getNextIdToCrawl) {
    const users = yield getInstagramUsers();
    console.log('Beginning run with users:');
    console.log(users);
    while (true) {
        const getNextUser = createUserCycler(users);

        let loopsLeftUntilLongSleep = EXECUTIONS_BETWEEN_LONG_SLEEP;
        while (loopsLeftUntilLongSleep > 0) {
            try {
                const results = yield (Array.apply(0, Array(PARALLELISM)).map(
                    (val) => crawlNextAccounts(getNextUser, getNextIdToCrawl, saveResult)
                ));

                const shouldStop = results.some((result) => result === false);
                if (shouldStop) {
                    break;
                }
                console.log('finished a set, continuing...');
            } catch (err) {
                console.log('error while executing a set');
                console.log(err);
                break;
            }
            loopsLeftUntilLongSleep--;
            console.log(`${loopsLeftUntilLongSleep} loops left until we enter hibernation...`)
        }
        yield countdownTimer(LONG_SLEEP_DURATION_IN_SECONDS);
    }

    console.log('done!');
});

const countdownTimer = co.wrap(function*(durationInSecs) {
    console.log(`Sleeping for approximately ${durationInSecs} seconds...`);
    let secondsSlept = 0;
    while (durationInSecs > secondsSlept) {
        yield bluebird.Promise.delay(1000);
        secondsSlept++;
        statusLog(`${durationInSecs - secondsSlept} seconds remaining...`);
    }
});

const createSessionWithUser = co.wrap(function*(user) {
    const device = new Client.Device(user.username);
    const session = yield Client.Session.create(device, storage, user.username, user.password);
    return session;
});

exports.createSessionWithUser = createSessionWithUser;
