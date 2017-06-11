const co = require('co');
const bluebird = require('bluebird');
const argv = require('optimist').argv;
const {getInstagramUsers, createUserCycler, saveResult, getNextIdToCrawl} = require('./backend_service');
const {createSessionWithUser, kickoff} = require('./instagram_service');

if (argv.getUsers) {
    getInstagramUsers().then((users) => {
        console.log('The following users have been assigned to your machine:');
        console.log(JSON.stringify(users, null, 4));
    });
} else if (argv.loginUsersOnce) {
    co.wrap(function*() {
        const users = yield getInstagramUsers();
        console.log('Got the following users: ');
        console.log(users);
        for (let index in users) {
            let user = users[index];
            try {
                yield createSessionWithUser(user);
                console.log('Successfully logged in ' + user.username);

            } catch (err) {
                console.log('Could not log in ' + user.username + '!! Try logging in to IG');
                console.log(err);
            }
            console.log('Waiting before trying next user...');
            yield bluebird.Promise.delay(1000);
        }
    })().then(() => console.log('done'));
} else {
    kickoff(getInstagramUsers, createUserCycler, saveResult, getNextIdToCrawl).then(() => console.log('woot'));
}
