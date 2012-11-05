
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
  
  var forward = function (api, forwarding) {

    // Set basic options for url forwarding
    var options = {
      host: api.host,
      port: api.port,
    },
    prefixLength = forwarding.localPrefix.length;
    
    return function (req, res, next) {
      
      // Set request specific options
      var reqPath = req.url.substring(prefixLength);
      options.path = reqPath;
      options.method = req.method;

      // Copy options to opt and place cookies from frontend request in opt variable
      var opt = copyCookiesFromClient(req, options);
      
      // Create a new API request
      var apiReq = http.request(opt, function(apiRes) {

        // Copy API result headers to our frontend result
        // Don't copy the date header as it will be set here
        // This includes encoding, status code and cookies
        for (var apiResHeader in apiRes.headers) {
         (function() {
          if (apiResHeader.toLowerCase() != 'date') {
            res.header(apiResHeader, apiRes.headers[apiResHeader]);
          }
         })();
        }
        
        // Retrieve data from the API
        var apiResData = ''
        apiRes.on('data', function (chunk) {
          apiResData += chunk;
        });
        apiRes.on('end', function () {
          res.send(apiResData);
          res.send('apiResData');
          //next();
        });

      }).on('error', function(err) {
        //console.log(err);
        next();
      });
      
      apiReq.end(); 
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