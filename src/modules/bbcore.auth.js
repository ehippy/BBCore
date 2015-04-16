/**
 * Authenticates a user using their Email Address (User Id) and Password
 * @arg {string} uid
 * @arg {string} pwd
 * @arg {responseSuccess} success
 */
BBCore.prototype.login = function (uid, pwd, success) {
    if (typeof uid === "function") {
        success = uid;
        uid = this.storage.getItem('b2-uid');
        pwd = this.storage.getItem('b2-pwd');
    }

    if (!uid) {
        this.onError({ info: { errormsg: 'Username cannot be blank' } });
        return;
    }

    this.userEmail = uid;

    var inst = this;
    this.sendRequest({method: "ValidateSession", email: uid, pw: pwd}, function (respObj) {
        inst.__updateSession(respObj, success);
    });
};

BBCore.prototype.logout = function () {
    this.storage.removeItem('b2-uid');
    this.storage.removeItem('b2-pwd');
    this.storage.removeItem('access_token');
    this.hasContext = false;
    this.authenticated = false;
};

/**
 * Returns bool for whether or not a prior authentication is stored locally
 * @returns {boolean}
 */
BBCore.prototype.credentialsSaved = function () {
    return null !== this.storage.getItem("b2-uid") || null !== this.storage.getItem("access_token");
};

/**
 * Save credentials to local storage (not recommended)
 * @arg {string} uid - User ID/Email Address
 * @arg {string} pwd - Password
 */
BBCore.prototype.saveCredentials = function (uid, pwd) {
    this.storage.setItem("b2-uid", uid);
    this.storage.setItem("b2-pwd", pwd);
};

/**
 * Authenticates from previously stored credentials
 * @arg {responseSuccess} onSuccess
 * @arg {responseSuccess} onError
 */
BBCore.prototype.resumeStoredSession = function (onSuccess, onError) {
    this.accessToken = this.storage.getItem("access_token");
    if (this.accessToken) {
        this.validateAccessToken(onSuccess);
    }
    else if (this.storage.getItem("b2-uid")) {
        this.login(onSuccess);
    }
    else {
        onError();
    }
};

/**
 *
 * @param onSuccess
 */
BBCore.prototype.validateAccessToken = function (onSuccess) {
    var inst = this;
    this.sendRequest({method: "ValidateSession", api_key: this.accessToken, async: false}, function (respObj) {
        inst.__updateSession(respObj, onSuccess);
    });
};


/**
 * Returns bool for authentication state
 * @returns {boolean|*}
 */
BBCore.prototype.isAuthenticated = function () {
    if (!this.authenticated) {
        console.log('You must authenticate a BombBomb session before making additional calls.');
    }
    return this.authenticated;
};

/**
 * Invalidates and clears the active session
 */
BBCore.prototype.invalidateSession = function () {
    var that = this;
    this.sendRequest({method: "invalidateKey"}, function () {
        that.clearKey();
        that.accessToken = "";
        that.authenticated = false;
        that.hasContext = false;
    });
};

BBCore.prototype.__updateSession = function (respObj, done) {
    if (respObj.status === "success") {
        this.userId = respObj.info.user_id;
        this.clientId = respObj.info.client_id;
        this.accessToken = respObj.info.api_key;
        this.hasContext = true;
        this.authenticated = true;

        this.storeKey(this.accessToken);

        // TODO; send request to fetch and update user details

        console.log('bbcore: __updateSession session updated.');

        if (done) {
            done.call(this, respObj);
        }
    }
};


/**
 * Validates the given key
 * @arg {string} key
 * @arg {responseSuccess} complete
 */
BBCore.prototype.verifyKey = function (key, complete) {
    // TODO; should ValidateSession replace this or vise-versa
    this.sendRequest({method: "GetEmails", api_key: key}, function (resp) {
        if (complete) {
            complete({isValid: (resp.status === "success")});
        }
    });
};

/**
 * Stores the give session key, typically used so a session can be resumed later on.
 * @arg key
 */
BBCore.prototype.storeKey = function (key) {
    if (!key)
    {
        return;
    }

    // currently this will use the API Key, in the future this should be updated to use a key which can be expired
    this.accessToken = key;
    this.storage.setItem("access_token", this.accessToken);
};

BBCore.prototype.getKey = function () {
    return this.accessToken;
};
BBCore.prototype.clearKey = function () {
    this.accessToken = null;
    this.storage.removeItem('access_token');
};