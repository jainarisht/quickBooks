var crypto = require('crypto'); // for validating payload
var conf = require('../conf');

/**
 * Validates the payload with the intuit-signature hash
 */
function isValidPayload(signature, payload) {
	var hash = crypto.createHmac('sha256', conf.webhooksverifier).update(payload).digest('base64');
	if (signature === hash) {
		return true;
	}
	return false;
}

module.exports.isValidPayload = isValidPayload;