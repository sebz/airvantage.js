module.exports = function(grunt) {

    grunt.loadNpmTasks("grunt-release");

    grunt.initConfig({
        release: {
            options: {
                github: {
                    repo: "sebz/airvantage.js",
                    usernameVar: "GITHUB_USERNAME",
                    passwordVar: "GITHUB_PASSWORD"
                }
            }
        }
    });
};
