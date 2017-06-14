const axios = require('axios');
const co = require('co');

const BASIC_AUTH = {
    username: 'admin',
    password: 'a1bd508c-79a3-454d-b935-e61ac7a968a4'
};

const BASE_URL = 'https://sn-shenanigans.herokuapp.com/';

const URL_PATHS = {
    ADD_CRAWL_RESULT: `add_crawl_result`,
    ADD_IG_USER: `add_ig_user`,
    GET_IG_USERS: `get_ig_users`,
    CLEAR_IP_AFFINITIES: `clear_ip_affinities`,
    GET_NEXT_MOLLY_ACCOUNT: `get_next_molly_account`,
    GET_NEXT_OLLY_ACCOUNT: `get_next_olly_account`,
    GET_NEXT_OTHER_ACCOUNT: `get_next_other_account`,
};

const makeServiceGetCall = co.wrap(function*(path) {
    return (yield axios.get(BASE_URL + path, { auth: BASIC_AUTH})).data;
});

const makeServicePostCall = co.wrap(function*(path, data) {
    return (yield axios.post(BASE_URL + path, data, { auth: BASIC_AUTH})).data;
});

exports.getInstagramUsers = co.wrap(function*() {
    try {
        return yield makeServiceGetCall(URL_PATHS.GET_IG_USERS);
    } catch (err) {
        console.log(err);
    }
});

exports.saveResult = co.wrap(function*(result) {
    return yield makeServicePostCall(URL_PATHS.ADD_CRAWL_RESULT, result);
});

exports.getNextIdToCrawl = co.wrap(function*() {
    // don't really care about perf here, always ask in priority order
    const mollyAccount = (yield makeServiceGetCall(URL_PATHS.GET_NEXT_MOLLY_ACCOUNT)).user_id;
    if (!!mollyAccount) {
        return mollyAccount;
    }
    const ollyAccount = (yield makeServiceGetCall(URL_PATHS.GET_NEXT_OLLY_ACCOUNT)).user_id;
    if (!!ollyAccount) {
        return ollyAccount;
    }
    const otherAccount = (yield makeServiceGetCall(URL_PATHS.GET_NEXT_OTHER_ACCOUNT)).user_id;
    if (!!otherAccount) {
        return otherAccount;
    }

    return undefined;
});

const MAX_BAD_REPORTS_PER_CYCLE = 4;
exports.createUserCycler = (users) => {
    const usersCopy = users.slice();
    usersCopy.forEach((user) => {
        user.reportedCount = 0;
        user.reportAsBad = () => {
            user.reportedCount++;
        };
    });

    let previousUser = undefined;
    return () => {
        const nextUser = usersCopy.find((user) => {
            return user.reportedCount < MAX_BAD_REPORTS_PER_CYCLE;
        });

        usersCopy.unshift(usersCopy.pop());

        if (previousUser === nextUser) {
            // we only have one valid user left, give up lest we kill them too
            return undefined;
        }

        previousUser = nextUser;

        return nextUser;
    };
};
