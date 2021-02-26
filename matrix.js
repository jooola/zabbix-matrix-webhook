const input = [
    'server',
    'room',
    'token',

    'message',
    'severity',
    'is_problem',
    'is_update',
]

const update_color = '#000000'
const recovery_color = '#098e68'
const severity_colors = [
    '#5a5a5a', // Not classified
    '#2caed6', // Information
    '#d6832c', // Warning
    '#d6542c', // Average
    '#d62c2c', // High
    '#ff0000', // Disaster
]

var Matrix = {
    validate: function (params) {
        input.forEach(function (key) {
            if (key in params && params[key] != undefined) {
                Matrix[key] = params[key]
            } else {
                throw 'Missing value for key: ' + key
            }
        })

        Matrix.severity = parseInt(Matrix.severity)
        Matrix.is_problem = parseInt(Matrix.is_problem)
        Matrix.is_update = parseInt(Matrix.is_update)

        if (Matrix.is_problem == 1) {
            if (Matrix.is_update == 0) {
                Matrix.kind = 'problem'
                Matrix.color = severity_colors[Matrix.severity]
            } else {
                Matrix.kind = 'update'
                Matrix.color = update_color
            }
        } else {
            Matrix.kind = 'recovery'
            Matrix.color = recovery_color
        }

        if (typeof params.HTTPProxy === 'string' && params.HTTPProxy.trim() !== '') {
            Matrix.http_proxy = params.HTTPProxy
        }
    },

    request: function (path, payload) {
        var request = new CurlHttpRequest()
        request.AddHeader('Content-Type: application/json')
        request.AddHeader('Authorization: Bearer ' + Matrix.token)

        var url = Matrix.server + path

        Zabbix.Log(4, '[Matrix Webhook] new request to: ' + url)

        if (Matrix.http_proxy != undefined) {
            request.setProxy(Matrix.http_proxy);
        }

        var blob = request.Post(url, JSON.stringify(payload))

        if (request.Status() !== 200) {
            var resp = JSON.parse(blob)

            if (request.Status() == 403 && resp.error.indexOf('not in room') !== -1) {
                throw 'User is not in room'
            }

            Zabbix.Log(4, '[Matrix Webhook] Request failed: ' + resp.error)
            throw 'Request failed: ' + request.Status() + ' ' + resp.error
        }
    },

    joinRoom: function () {
        Matrix.request('/_matrix/client/r0/rooms/' + Matrix.room + '/join', {})
    },

    sendMessage: function () {
        Matrix.messageFormatted = '<span data-mx-color="' + Matrix.color + '">'
            + Matrix.message.replace(/\n/g, '<br>')
            + '</span>'

        Matrix.request(
            '/_matrix/client/r0/rooms/' + Matrix.room + '/send/m.room.message',
            {
                msgtype: 'm.text',
                body: Matrix.message,
                format: 'org.matrix.custom.html',
                formatted_body: Matrix.messageFormatted,
            }
        )
    },
}

try {
    var params = JSON.parse(value)

    Matrix.validate(params)

    try {
        Matrix.sendMessage()
    } catch (error) {
        if (error == 'User is not in room') {
            Matrix.joinRoom()
            Matrix.sendMessage()
        } else {
            throw error;
        }
    }

    return 'OK'
} catch (error) {
    Zabbix.Log(4, '[Matrix Webhook] Error: ' + error)
    throw 'Sending failed: ' + error
}
