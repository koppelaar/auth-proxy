
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

  
  var exports = {
  
    copyCookiesFromServer: copyCookiesFromServer,
    
    copyCookiesFromClient: copyCookiesFromClient,
    
    validate: function (options) {
      return function (req, res, next) {
        var opt = copyCookiesFromClient(req, options);
        var apiReq = http.request(opt, function(apiRes) {
          if (apiRes.headers['content-type'].indexOf('utf-8') != -1 ||
              apiRes.headers['content-type'].indexOf('utf8') != -1) {
            apiRes.setEncoding('utf8');
          }
          copyCookiesFromServer(apiRes, res);
          var apiResData = ''
          apiRes.on('data', function (chunk) {
            apiResData += chunk;
          });
          apiRes.on('end', function () {
            if (apiRes.headers['content-type'].indexOf('application/json') != -1) {
              apiResData = JSON.parse(apiResData);
            }
            req.authProxy = {statusCode:apiRes.statusCode,data:apiResData};
            next();
          });
        }).on('error', function(err) {
          //console.log(err);
          next();
        });
        apiReq.end(); 
      };
    },
    
    ensure: fnEnsure
  }
    
  return exports;
  
};