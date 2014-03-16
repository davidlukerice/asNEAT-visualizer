module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    jshint: {
      files: [
        'gruntfile.js',
        'src/**/*.js',
        '!src/vendor/*.js',
        'test/test/*.js'],
      options: {
        globals: {
          jQuery: true,
          console: true,
          module: true
        }
      }
    },

    clean: {
      build: ['tmp']
    },

    copy: {
      main: {
        files: [{
          expand: true,
          cwd:'src',
          src: ['**/*.js'],
          dest: 'tmp/javascript/'
        }]
      }
    },

    transpile: {
      main: {
        type: 'amd',
        moduleName: function(path) {
          return grunt.config.process('<%= pkg.name %>/') + path;
        },
        files: [{
          expand: true,
          cwd: 'tmp/javascript/',
          src: ['**/*.js'],
          dest: 'tmp/transpiled/'
        }]
      }
    },

    concat: {
      options: {
        separator: ';'
      },
      dist: {
        src: ['src/vendor/*.js', 'tmp/transpiled/*.js'],
        dest: 'dist/<%= pkg.name %>.js'
      }
    },

    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> <%= pkg.version %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
      },
      dist: {
        files: {
          'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
        }
      }
    },




    qunit: {
      files: ['test/**/*.html']
    },
    
    watch: {
      lint: {
        files: ['<%= jshint.files %>'],
        tasks: ['jshint', 'qunit']        
      },
      dist: {
        files: ['src/**/*.js'],
        tasks: ['concat', 'qunit', 'uglify']
      }
    },
    concurrent: {
      options: {
        logConcurrentOutput: true
      },
      watches: {
        tasks: ["watch:lint", "watch:dist"]
      }
    }
  });

  // Load the plugins
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-concurrent');
  grunt.loadNpmTasks('grunt-es6-module-transpiler');

  // task(s).
  //grunt.registerTask('test', ['jshint', 'qunit']);
  //grunt.registerTask('dist', ['jshint', 'concat', 'qunit', 'uglify']);
  //grunt.registerTask('watchLint', ['watch:lint']);
  //grunt.registerTask('watchDist', ['test', 'dist', 'concurrent:watches']);
  //grunt.registerTask('default', ['watchDist']);

  grunt.registerTask('build', [
    'jshint',
    'qunit',
    'clean:build',
    'copy',
    'transpile',
    'concat',
    'uglify'
  ]);
};