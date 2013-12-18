var path = require('path'); // File path processing. http://nodejs.org/api/path.html
var _ = require('underscore'); // Utilities. http://underscorejs.org/
var fs = require('node-fs'); // Recursive directory creation. https://github.com/bpedro/node-fs
var unzip = require('unzip'); // Extract zip files. https://github.com/nearinfinity/node-unzip
var winston = require('winston'); // Logging. https://github.com/flatiron/winston

var ContentUpdater = require('./contentUpdater.js');

// Like ContentUpdater except for a single file, which gets unzipped when it's done loading.
exports.AppUpdater = ContentUpdater.ContentUpdater.extend({

	defaults: _.extend(_.clone(ContentUpdater.ContentUpdater.prototype.defaults), {
		// The final local path for the app.
		local: '../app/',

		// The temp path for the app.
		temp: '../app.tmp/'
	}),

	initialize: function() {
		var filename = path.basename(this.get('remote'));
		var file = new ContentUpdater.ContentFile({
			url: this.get('remote'),
			filePath: this.get('local') + filename,
			tempPath: this.get('temp') + filename
		});

		file.on('loaded', this._onFileLoaded, this);

		this.set('files', new ContentUpdater.ContentFiles());
		this.get('files').add(file);
	},

	update: function(callback) {
		this._callback = callback;
		this.initialize();
		var file = this.get('files').at(0);

		this._initDirectories(_.bind(function() {
			if (this.get('remote').indexOf('http') === 0) {
				// We're going to download a file from the web using the content updater logic.
				this._processFile(file);
			} else {
				// We're just going to copy a local file.
				this._robocopy(
					path.dirname(this.get('remote')),
					path.dirname(path.resolve(file.get('tempPath'))),
					path.basename(this.get('remote')),
					_.bind(function(code) {
						if (code === 0) {
							// Nothing was copied.
							ContentUpdater.ContentUpdater.prototype._completed.call(this);
						} else if (code <= 8) {
							// Stuff was copied.
							this._processFiles();
						} else {
							// Something bad happened.
							winston.error('Robocopy failed with code ' + code);
						}
					}, this));
			}
		}, this));
	},

	_completed: function() {
		var file = this.get('files').at(0);

		// Not a zip file, so bail.
		if (path.extname(file.get('url')).toUpperCase() != '.ZIP') {
			ContentUpdater.ContentUpdater.prototype._completed.call(this);
			return;
		}

		// Unzip the file.
		winston.info('Unzipping app.');
		fs.createReadStream(
			file.get('filePath'))
			.pipe(unzip.Extract({
				path: path.dirname(file.get('filePath'))
			})).on('finish', _.bind(function(error) {
				this._handleError('Error unzipping app.', error);
				if (error) {
					ContentUpdater.ContentUpdater.prototype._completed.call(this);
					return;
				}

				// Delete the zip file.
				fs.unlink(file.get('filePath'), _.bind(function() {
					ContentUpdater.ContentUpdater.prototype._completed.call(this);
				}, this));
			}, this));
	}
});