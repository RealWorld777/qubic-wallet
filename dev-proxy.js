var express = require('express'),
    request = require('request'),
    bodyParser = require('body-parser');

function createProxy(targetURL, port) {
    var app = express();
    var myLimit = typeof(process.argv[2]) != 'undefined' ? process.argv[2] : '500kb';
    console.log('Using limit: ', myLimit);

    app.use(bodyParser.json({limit: myLimit}));

    app.all('*', function (req, res, next) {

        // allow CORS
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Methods", "GET, PUT, PATCH, POST, DELETE");
        res.header("Access-Control-Allow-Headers", req.header('access-control-request-headers'));

        if (req.method === 'OPTIONS') {
            // CORS Preflight
            res.send();
        } else {
            if (!targetURL) {
                res.status(500).send({ error: 'There is no Target-Endpoint header in the request' });
                return;
            }
            console.log("API CALL: " + req.method  + "\t" + targetURL + req.url);
            request({ url: targetURL + req.url, method: req.method, json: req.body, headers: {'Authorization': req.header('Authorization')} },
                function (error, response, body) {
                    if (error) {
                        console.error('error: ' + response.statusCode);
                    }
                }).pipe(res);
        }
    });

    app.set('port', port);

    app.listen(app.get('port'), function () {
        console.log('Proxy server listening on port ' + app.get('port'));
    });
}

// Create two proxy instances with different target URLs and ports
// createProxy("https://api.qubic.li", 7003);
createProxy("https://testapi.qubic.org", 7004);
createProxy("http://116.202.157.215:8000", 7003);
// createProxy("http://116.202.157.215:8080", 7004);
