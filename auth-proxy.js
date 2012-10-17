
exports.init = function (fnEnsure) {

  var http = require('http');

  var copyCookiesFromServer = function (from, to) {
    if (from.headers['set-cookie']) {
      from.headers['set-cookie'].forEach(function (el) {
        to.setHeader('set-cookie', el);
      });
    }
  };

  var copyCookiesFromClient = function (req, options) {
    if (req.headers.cookie) {
      options.headers = {cookie: req.headers.cookie};
    }
    return options;
  };

  var forward = function (options) {
    return function (req, res, next) {
      res.send('hoi');
    };  
  };

  var validate = function (options) {
    return function (req, res, next) {
    
      /* Options expects a variable like:
       *  options: {
       *  host: 'api.yourdomain.com',
       *  port: 80,
       *  path: '/relative/url/that/validates/a/user',
       *  method: 'GET'
       *  }
      */
      // Copy options to opt and place cookies from frontend request in opt variable
      var opt = copyCookiesFromClient(req, options);
      
      // Create a new API request
      var apiReq = http.request(opt, function(apiRes) {
      
        // Set encoding if it isn't being set by the API server
        if (apiRes.headers['content-type'].indexOf('utf-8') != -1 ||
            apiRes.headers['content-type'].indexOf('utf8') != -1) {
          apiRes.setEncoding('utf8');
        }
        
        // Copy cookies from API back to the frontend request
        copyCookiesFromServer(apiRes, res);
        
        // Retrieve data from the API
        var apiResData = ''
        apiRes.on('data', function (chunk) {
          apiResData += chunk;
        });
        apiRes.on('end', function () {
          if (apiRes.headers['content-type'].indexOf('application/json') != -1) {
            apiResData = JSON.parse(apiResData);
          }
          req.authProxy = {statusCode:apiRes.statusCode, data:apiResData};
          next();
        });
        
      // In case of an error, simply call next()
      }).on('error', function(err) {
        //console.log(err);
        next();
      });

      apiReq.end(); 
    };
  };
  
  var exports = {

    copyCookiesFromServer: copyCookiesFromServer,

    copyCookiesFromClient: copyCookiesFromClient,

    forward: forward,

    validate: validate,

    ensure: fnEnsure || function (urlUnauthorized) {
      return function (req,res,next) {

        // If the API returned 'signedIn', continue
        if (req.authProxy &&
            req.auth.data &&
            req.auth.data.status == 'signedIn') {
          return next();
          
        // If not, redirect to a special URL
        } else {
          res.redirect(urlUnauthorized);
        }
      };
    }
  }
    
  return exports;
  
};