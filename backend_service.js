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
};

exports.getInstagramUsers = co.wrap(function*() {
    try {
        return (yield axios.get(BASE_URL + URL_PATHS.GET_IG_USERS, { auth: BASIC_AUTH})).data;
    } catch (err) {
        console.log(err);
    }
});

exports.createUserCycler = (users) => {
    let currentuser = -1;
    return () => {
        currentuser++;
        if (currentuser >= users.length) { currentuser = 0; }

        return users[currentuser];
    };
};
