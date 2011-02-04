require('./spec_helper').init(exports);

[ 'redis~'
, 'mysql'
, 'mongodb~'
, 'postgres~'
].forEach(function (driver) {
    context(driver, testCasesFor(driver));
});

function testCasesFor (driver) {
    return function () {

        function Post ()    { this.initialize.apply(this, Array.prototype.slice.call(arguments)); }
        function Comment () { this.initialize.apply(this, Array.prototype.slice.call(arguments)); }

        var properties = {};

        properties['post'] = {
            title:     { type: String, validate: /.{10,255}/ },
            content:   { type: String  },
            published: { type: Boolean, default: false },
            date:      { type: Date, default: function () {return new Date} }
        };

        properties['comment'] = {
            content:   { type: String, validate: /./  },
            date:      { type: Date    },
            author:    { type: String  }
        };

        var associations = {};
        associations['post'] = {
            comments: {className: 'Comment', relationType: 'n'}
        };

        associations['comment'] = {
            post:     {className: 'Post', relationType: '<'}
        };

        try {
            var orm = require('../lib/datamapper/' + driver);
            if (driver == 'mysql') {
                orm.configure({
                    database: 'test_orm',
                    user: 'test',
                    password: 'passw0rd'
                });
            }
        } catch (e) {
            return;
        }
        // orm.debugMode = true;
        orm.mixPersistMethods(Post,    'Post',    properties['post'],    associations['post']);
        orm.mixPersistMethods(Comment, 'Comment', properties['comment'], associations['comment']);

        it('should initialize object properly', function (test) {
            var hw = 'Hello world', post = new Post({title: hw});
            test.equal(post.title, hw);
            test.ok(!post.propertyChanged('title'));
            post.title = 'Goodbye, Lenin';
            test.equal(post.title_was, hw);
            test.ok(post.propertyChanged('title'));
            test.ok(post.isNewRecord());
            test.done();
        });

        it('should create object', function (test) {
            Post.create(function () {
                test.ok(this.id);
                Post.exists(this.id, function (exists) {
                    test.ok(exists);
                    test.done();
                });
            });
        });

        it('should save object', function (test) {
            var title = 'Initial title', title2 = 'Hello world',
                date = new Date;

            Post.create({
                title: title,
                date: date
            }, function () {
                test.ok(this.id);
                test.equals(this.title, title);
                test.equals(this.date, date);
                this.title = title2;
                this.save(function () {
                    test.equal(this.title, title2);
                    test.ok(!this.propertyChanged('title'));
                    test.done();
                });
            });
        });

        it('should create object with initial data', function (test) {
            var title = 'Initial title',
                date = new Date;

            Post.create({
                title: title,
                date: date
            }, function () {
                test.ok(this.id);
                test.equals(this.title, title);
                test.equals(this.date, date);
                Post.find(this.id, function () {
                    test.equal(this.title, title);
                    test.equal(this.date, date.toString());
                    test.done();
                });
            });
        });

        it('should not create new instances for the same object', function (test) {
            var title = 'Initial title';
            Post.create({ title: title }, function () {
                var post = this;
                test.ok(this.id, 'Object should have id');
                test.equals(this.title, title);
                Post.find(this.id, function () {
                    test.equal(this.title, title);
                    test.strictEqual(this, post);
                    test.done();
                });
            });
        });

        it('should destroy object', function (test) {
            Post.create(function () {
                var post = this;
                Post.exists(post.id, function (exists) {
                    test.ok(exists, 'Object exists');
                    post.destroy(function () {
                        Post.exists(post.id, function (exists) {
                            test.ok(!exists, 'Object not exists');
                            Post.find(post.id, function (err, obj) {
                                test.ok(err, 'Object not found');
                                test.equal(obj, null, 'Param obj should be null');
                                test.done();
                            });
                        });
                    });
                });
            });
        });

        it('should update single attribute', function (test) {
            Post.create({title: 'title', content: 'content'}, function () {
                this.content = 'New content';
                this.update_attribute('title', 'New title', function () {
                    test.equal(this.title, 'New title');
                    test.ok(!this.propertyChanged('title'));
                    test.equal(this.content, 'New content');
                    test.ok(this.propertyChanged('content'));
                    this.reload(function () {
                        test.equal(this.title, 'New title');
                        test.ok(!this.propertyChanged('title'));
                        test.equal(this.content, 'content');
                        test.ok(!this.propertyChanged('content'));
                        test.done();
                    });
                });
            });
        });

        // NOTE: this test rely on previous
        it('should fetch collection', function (test) {
            Post.all(function (posts) {
                test.ok(posts.length > 0);
                test.strictEqual(posts[0].constructor, Post);
                test.done();
            });
        });

        it('should fetch associated collection', function (test) {
            Post.create(function () {
                // load collection
                this.comments(function () {
                });
                // creating associated object
                this.comments.create(function () {
                });
                this.comments.build().save();
                // named scopes
                this.comments.pending(function () {
                });
                this.comments.approved(function () {
                });
            });
        });

        it('should validate object', function (test) {
            var post = new Post;
            test.ok(!post.isValid());
            post.save(function (id) {
                test.ok(!id, 'Post should not be saved');
            });
            post.title = 'Title';
            test.ok(post.isValid());
            post.save(function (id) {
                test.ok(id);
                test.done();
            });
        });
    }
};
