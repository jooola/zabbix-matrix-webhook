var Data = {
    server_url: null, // "<server_url>"
    room_id: null, // "{ALERT.SENDTO}"
    token: null, // "<token>"
    event_date: null, // "{EVENT.DATE}"
    event_time: null, // "{EVENT.TIME}"
    event_age: null, // "{EVENT.AGE}"
    event_duration: null, // "{EVENT.DURATION}"
    event_id: null, // "{EVENT.ID}"
    event_name: null, // "{EVENT.NAME}"
    event_value: null, // "{EVENT.VALUE}"
    event_severity: null, // "{EVENT.SEVERITY}"
    event_nseverity: null, // "{EVENT.NSEVERITY}"
    event_opdata: null, // "{EVENT.OPDATA}"
    event_status: null, // "{EVENT.STATUS}"
    event_ack_status: null, // "{EVENT.ACK.STATUS}"
    event_recovery_date: null, // "{EVENT.RECOVERY.DATE}"
    event_recovery_time: null, // "{EVENT.RECOVERY.TIME}"
    event_update_date: null, // "{EVENT.UPDATE.DATE}"
    event_update_time: null, // "{EVENT.UPDATE.TIME}"
    event_update_action: null, // "{EVENT.UPDATE.ACTION}"
    event_update_message: null, // "{EVENT.UPDATE.MESSAGE}"
    host_name: null, // "{HOST.NAME}"
    trigger_url: null, // "{TRIGGER.URL}"
    user_fullname: null, // "{USER.FULLNAME}"
}

const update_color = "#d2d2d2"
const recovery_color = "#86cc89"
const severity_colors = [
    "#97aab3", // Not classified
    "#7499ff", // Information
    "#ffc859", // Warning
    "#ffa059", // Average
    "#e97659", // High
    "#e45959", // Disaster
]

function problem_plain(it) {
    return "Problem started at " + it.event_time + " on " + it.event_date + "\n"
        + "Problem name: " + it.event_name + "\n"
        + "Host: " + it.host_name + "\n"
        + "Severity: " + it.event_severity + "\n"
        + "Operational data: " + it.event_opdata + "\n"
        + "Original problem ID: " + it.event_id + "\n"
        + it.trigger_url;
};

function problem_html(it) {
    return "<span data-mx-color='" + severity_colors[it.event_nseverity] + "'>"
        + "<b>Problem started</b> at " + it.event_time + " on " + it.event_date + "<br>"
        + "<b>Problem name:</b> " + it.event_name + "<br>"
        + "<b>Host:</b> " + it.host_name + "<br>"
        + "<b>Severity:</b> " + it.event_severity + "<br>"
        + "<b>Operational data:</b> " + it.event_opdata + "<br>"
        + "<b>Original problem ID:</b> " + it.event_id + "<br>"
        + it.trigger_url
        + "</span>";
};

function recovery_plain(it) {
    return "Problem has been resolved at " + it.event_recovery_time + " on " + it.event_recovery_date + "\n"
        + "Problem name: " + it.event_name + "\n"
        + "Problem duration: " + it.event_duration + "\n"
        + "Host: " + it.host_name + "\n"
        + "Severity: " + it.event_severity + "\n"
        + "Original problem ID: " + it.event_id + "\n"
        + it.trigger_url;
};

function recovery_html(it) {
    return "<span data-mx-color='" + recovery_color + "'>"
        + "<b>Problem has been resolved</b> at " + it.event_recovery_time + " on " + it.event_recovery_date + "<br>"
        + "<b>Problem name:</b> " + it.event_name + "<br>"
        + "<b>Problem duration:</b> " + it.event_duration + "<br>"
        + "<b>Host:</b> " + it.host_name + "<br>"
        + "<b>Severity:</b> " + it.event_severity + "<br>"
        + "<b>Original problem ID:</b> " + it.event_id + "<br>"
        + it.trigger_url
        + "</span>";
};

function update_plain(it) {
    return it.user_fullname + " " + it.event_update_action + " problem at " + it.event_update_date + " " + it.event_update_time + "\n"
        + it.event_update_message + "\n"
        + "\n"
        + "Current problem status: " + it.event_status + "\n"
        + "Age: " + it.event_age + "\n"
        + "Acknowledged: " + it.event_ack_status;
};

function update_html(it) {
    return "<span data-mx-color='" + update_color + "'>"
        + "<b>" + it.user_fullname + " " + it.event_update_action + " problem</b> at " + it.event_update_date + " " + it.event_update_time + "<br>"
        + "<code>" + it.event_update_message + "</code><br>"
        + "<br>"
        + "<b>Current problem status:</b> " + it.event_status + "<br>"
        + "<b>Age:</b> " + it.event_age + "<br>"
        + "<b>Acknowledged:</b> " + it.event_ack_status
        + "<span>";
};

var Matrix = {
    validate: function (params) {
        Object.keys(Data).forEach(function (key) {
            if (key in params && params[key] != undefined) {
                Object.defineProperty(Matrix, key, { value: params[key] })
            } else {
                throw "Missing value for key: " + key;
            }
        })

        if (Matrix.event_value == 0) {
            Matrix.template_plain = recovery_plain
            Matrix.template_html = recovery_html
        } else {
            if (Matrix.event_update_status == 0) {
                Matrix.template_plain = problem_plain
                Matrix.template_html = problem_html
            } else {
                Matrix.template_plain = update_plain
                Matrix.template_html = problem_html
            }
        }
    },

    request: function (path, payload) {
        var request = new CurlHttpRequest();
        request.AddHeader("Content-Type: application/json");
        request.AddHeader("Authorization: Bearer " + Matrix.token);

        var url = Matrix.server_url + path;

        Zabbix.Log(4, "[Matrix Webhook] new request to: " + url);

        var blob = request.Post(url, JSON.stringify(payload));

        if (request.Status() !== 200) {
            var resp = JSON.parse(blob);
            Zabbix.Log(4, "[Matrix Webhook] Request failed: " + resp);
            throw "Request failed: " + request.Status() + " " + resp.error;
        }
    },

    sendMessage: function () {
        Matrix.request(
            "/_matrix/client/r0/rooms/" + Matrix.room_id + "/send/m.room.message",
            {
                msgtype: "m.text",
                body: Matrix.template_plain(Matrix),
                format: "org.matrix.custom.html",
                formatted_body: Matrix.template_html(Matrix),
            }
        )
    }
}

try {
    var params = JSON.parse(value);

    Matrix.validate(params)
    Matrix.sendMessage()

    return "OK"
} catch (error) {
    Zabbix.Log(4, "[Matrix Webhook] Error: " + error);
    throw "Sending failed: " + error;
}
