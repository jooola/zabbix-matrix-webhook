const required_input = [
  "matrix_url",
  "matrix_room",
  "matrix_token",

  "alert_subject",
  "alert_message",

  "event_severity",
  "event_is_problem",
  "event_is_update",

  "enable_colors",
  "enable_icons",
]

const update_color = "#000000"
const recovery_color = "#098e68"
const severity_colors = [
  "#5a5a5a", // Not classified
  "#2caed6", // Information
  "#d6832c", // Warning
  "#d6542c", // Average
  "#d62c2c", // High
  "#ff0000", // Disaster
]
const recovery_icon = String.fromCodePoint("0x2705")
const severity_icons = [
  String.fromCodePoint("0x2754"), // Not classified
  String.fromCodePoint("0x2139"), // Information
  String.fromCodePoint("0x26a0"), // Warning
  String.fromCodePoint("0x274c"), // Average
  String.fromCodePoint("0x1f525"), // High
  String.fromCodePoint("0x1f4a5"), // Disaster
]

var Matrix = {
  validate: function (params) {
    required_input.forEach(function (key) {
      if (key in params && params[key] != undefined) {
        Matrix[key] = params[key]
      } else {
        throw "Missing value for key: " + key
      }
    })

    Matrix.alert_subject = Matrix.alert_subject.replace(/\r/g, "")
    Matrix.alert_message = Matrix.alert_message.replace(/\r/g, "")

    Matrix.event_severity = parseInt(Matrix.event_severity)
    Matrix.event_is_problem = parseInt(Matrix.event_is_problem)
    Matrix.event_is_update = parseInt(Matrix.event_is_update)

    if (typeof params.event_url === "string" && params.event_url.trim() !== "") {
      Matrix.event_url = params.event_url
    }

    Matrix.enable_colors = Matrix.enable_colors.toLowerCase() == "true"
    Matrix.enable_icons = Matrix.enable_icons.toLowerCase() == "true"

    if (typeof params.http_proxy === "string" && params.http_proxy.trim() !== "") {
      Matrix.http_proxy = params.http_proxy
    }

    if (Matrix.event_is_problem == 1) {
      if (Matrix.event_is_update == 0) {
        Matrix.kind = "problem"
        Matrix.color = severity_colors[Matrix.event_severity]
        Matrix.icon = severity_icons[Matrix.event_severity]
      } else {
        Matrix.kind = "update"
        Matrix.color = update_color
        Matrix.icon = false
      }
    } else {
      Matrix.kind = "recovery"
      Matrix.color = recovery_color
      Matrix.icon = recovery_icon
    }
  },

  request: function (path, payload) {
    var request = new CurlHttpRequest()
    request.AddHeader("Content-Type: application/json")
    request.AddHeader("Authorization: Bearer " + Matrix.matrix_token)

    var url = Matrix.matrix_url + path

    Zabbix.Log(4, "[Matrix Webhook] new request to: " + url)

    if (Matrix.http_proxy != undefined) {
      request.SetProxy(Matrix.http_proxy)
    }

    var blob = request.Post(url, JSON.stringify(payload))

    if (request.Status() !== 200) {
      var resp = JSON.parse(blob)

      if (request.Status() == 403 && resp.error.indexOf("not in room") !== -1) {
        throw "User is not in room"
      }

      Zabbix.Log(4, "[Matrix Webhook] Request failed: " + resp.error)
      throw "Request failed: " + request.Status() + " " + resp.error
    }
  },

  joinRoom: function () {
    Matrix.request("/_matrix/client/r0/rooms/" + Matrix.matrix_room + "/join", {})
  },

  sendMessage: function () {
    var body = ""
    if (Matrix.enable_icons && Matrix.icon) {
      body += Matrix.icon + " "
    }
    body += Matrix.alert_subject + "\n"
    body += Matrix.alert_message

    if (Matrix.event_url != undefined) {
      body += "\n" + Matrix.event_url
    }

    var formatted_body = ""
    if (Matrix.enable_colors) {
      formatted_body += '<span data-mx-color="{color}">'.replace("{color}", Matrix.color)
    } else {
      formatted_body += "<span>"
    }

    formatted_body += "<strong>"
    if (Matrix.enable_icons && Matrix.icon) {
      formatted_body += Matrix.icon + " "
    }

    if (Matrix.event_url != undefined) {
      formatted_body += '<a href="{href}">'.replace("{href}", Matrix.event_url)
    }

    formatted_body += Matrix.alert_subject

    if (Matrix.event_url != undefined) {
      formatted_body += "</a>"
    }

    formatted_body += "</strong><br />"

    formatted_body += Matrix.alert_message.replace(/\n/g, "<br />")
    formatted_body += "</span>"

    const payload = {
      body: body,
      msgtype: "m.notice",
      format: "org.matrix.custom.html",
      formatted_body: formatted_body,
    }

    Matrix.request(
      "/_matrix/client/r0/rooms/" + Matrix.matrix_room + "/send/m.room.message",
      payload
    )
  },
}

try {
  var params = JSON.parse(value)

  Matrix.validate(params)

  try {
    Matrix.sendMessage()
  } catch (error) {
    if (error == "User is not in room") {
      Matrix.joinRoom()
      Matrix.sendMessage()
    } else {
      throw error
    }
  }

  return "OK"
} catch (error) {
  Zabbix.Log(4, "[Matrix Webhook] Error: " + error)
  throw "Sending failed: " + error
}
