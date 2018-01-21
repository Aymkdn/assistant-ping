var request = require('request-promise-native'); // si vous souhaitez faire des requêtes HTTP
var ping = require("net-ping");

/**
 * on crée une fonction `AssistantPing`
 * @param {Object} configuration L'objet `configuration` qui vient du fichier configuration.json
 */
var AssistantPing = function(configuration) {
  // par exemple configuration.key si on a `{ "key": "XXX" }` dans le fichier configuration.json
  // exemple: this.key = configuration.key;
  this.timeout=-1;
}

/**
 * Il faut ensuite créer une fonction `init()`
 *
 * @param  {Object} plugins Un objet représentant les autres plugins chargés
 * @return {Promise}
 */
AssistantPing.prototype.init = function(plugins) {
  this.plugins = plugins;
  // si une configuration est requise (en reprenant l'exemple de "key") :
  // if (!this.key) return Promise.reject("[assistant-depart] Erreur : vous devez configurer ce plugin !");
  return Promise.resolve(this);
};

/**
 * Ping l'ip
 *
 * @param  {String} ip Adresse IP
 * @return {Promise}
 */
AssistantPing.prototype.ping = function(status, ip) {
  var _this=this;
  return new Promise(function(prom_res) {
    var session = ping.createSession();
    // on attend que le téléphone ne soit plus là
    session.pingHost(ip, function (error, target) {
      if (error) { // machine éteinte
        if (status==="off") {
          console.log("[assistant-ping] La machine "+target+" est éteinte.");
          prom_res();
        } else {
          console.log("[assistant-ping] On attend que la machine "+target+" soit allumée.");
          // on retente dans 30 secondes
          _this.timeout = setTimeout(function() {
             _this.ping(status, ip).then(function() { console.log("ok"); prom_res() })
          }, 5000)
        }
      } else {
        if (status==="on") {
          console.log("[assistant-ping] La machine "+target+" est allumée.");
          prom_res();
        }
        else {
          console.log("[assistant-ping] On attend que la machine "+target+" soit éteinte.");
          // on retente dans 30 secondes
          _this.timeout = setTimeout(function() {
             _this.ping(status, ip).then(function() { prom_res() })
          }, 5000)
        }
      }
    });
  })
};
/**
 * Fonction appelée par le système central
 *
 * @param {String} commande La commande envoyée depuis IFTTT par Pushbullet ("on 192.168.0.81" ou "off 192.168.0.81")
 * @return {Promise}
 */
AssistantPing.prototype.action = function(commande) {
  var _this=this;
  commande = commande.split(" ");
  if (commande[0] === "cancel" && _this.timeout!==-1) {
    clearTimeout(_this.timeout);
    _this.timeout=-1;
    console.log("[assistant-ping] Ping annulé.");
    return Promise.resolve();
  } else {
    return _this.ping(commande[0], commande[1]);
  }
};

/**
 * Initialisation du plugin
 *
 * @param  {Object} configuration La configuration
 * @param  {Object} plugins Un objet qui contient tous les plugins chargés
 * @return {Promise} resolve(this)
 */
exports.init=function(configuration, plugins) {
  return new AssistantPing(configuration).init(plugins)
  .then(function(resource) {
    console.log("[assistant-depart] Plugin chargé et prêt.");
    return resource;
  })
}

/**
 * À noter qu'il est également possible de sauvegarder des informations supplémentaires dans le fichier configuration.json général
 * Pour cela on appellera this.plugins.assistant.saveConfig('nom-du-plugin', {configuration_en_json_complète}); (exemple dans le plugin freebox)
 */
