const should = require('should');
const q = require('q');
const app = require('../app');
const request = require('supertest');
const db = require('../../utils/db');
const users = require('../../fixtures/users.json');
const admins = require('../../fixtures/admins.json');
const User = require('../../models/user');
const Admin = require('../../models/admin');
const logger = require('../../../src/utils/logger');

describe('Integration Tests', function() {
    describe('Controllers', function() {
        describe('Patch', function() {
            before(function(done) {
                db.connect().
                then(function() {
                    return db.import(User, users);
                }).
                then(function() {
                    return db.import(Admin, admins);
                }).
                then(function() {
                    return app.init();
                }).
                then(function() {
                    done();
                }).
                fail(function(err) {
                    logger.error(err);
                });
            });

            after(function(done) {
                q.all([
                    db.removeAll(User),
                    db.removeAll(Admin)
                ]).
                then(function() {
                    return app.stop();
                }).
                then(function() {
                    return db.disconnect();
                }).
                then(function() {
                    done();
                }).
                fail(function(err) {
                    logger.error(err);
                });
            });

            it('should update an existing resource', function(done) {
                const id = users[3]._id;
                const updates = {
                    data: {
                        id: id,
                        attributes: {
                            'last-name': 'Lovegood'
                        }
                    }
                };

                request(app.getExpressApplication()).
                patch('/users/' + id).
                set('Content-Type', 'application/json').
                send(updates).
                expect(200).
                end(function(err, res) {
                    should.not.exist(err);

                    // data response has been transformed by serializer
                    res.body.data.name.last.should.be.equal('Lovegood');
                    res.body.data.name.first.should.be.equal('Ada');
                    done();
                });
            });

            it('should return http 404 when updating a missing record', function(done) {
                const id = '5630743e2446a0672a4ee793';
                const updates = {
                    data: {
                        id: id,
                        attributes: {
                            'last-name': 'this should fail'
                        }
                    }
                };

                request(app.getExpressApplication()).
                patch('/users/' + id).
                set('Content-Type', 'application/json').
                send(updates).
                expect(404, done);
            });

            it('should return http 400 if `attributes` are missing', function(done) {
                const id = users[0]._id;
                const updates = {
                    data: {
                        id: id,
                        meta: {
                            stuff: 'this should fail'
                        }
                    }
                };

                request(app.getExpressApplication()).
                patch('/users/' + id).
                set('Content-Type', 'application/json').
                send(updates).
                expect(400, done);
            });

            it('should return http 400 if `id` is missing', function(done) {
                const id = users[0]._id;
                const updates = {
                    data: {
                        meta: {
                            stuff: 'this should fail'
                        }
                    }
                };

                request(app.getExpressApplication()).
                patch('/users/' + id).
                set('Content-Type', 'application/json').
                send(updates).
                expect(400, done);
            });

            it('should sanitize all fields', function(done) {
                const id = admins[0]._id;
                const updates = {
                    data: {
                        id: id,
                        attributes: {
                            'first-name': '<script>Watermelon</script>',
                            'last-name': '<script>alert("xss")</script>'
                        }
                    }
                };

                request(app.getExpressApplication()).
                patch('/admins/' + id).
                set('Content-Type', 'application/json').
                send(updates).
                expect(200).
                end(function(err, res) {
                    should.not.exist(err);
                    res.body.data['first-name'].should.be.equal('&lt;script>Watermelon&lt;/script>');
                    res.body.data['last-name'].should.be.equal('&lt;script>alert("xss")&lt;/script>');
                    done();
                });
            });

            it('should sanitize nested fields', function(done) {
                const id = admins[0]._id;
                const updates = {
                    data: {
                        id: id,
                        attributes: {
                            'first-name': '<script>Watermelon</script>',
                            'last-name': '<script>alert("xss")</script>',
                            address: {
                                state: '<script>alert("xss")</script>',
                                city: 'Atlantic'
                            }
                        }
                    }
                };

                request(app.getExpressApplication()).
                patch('/admins/' + id).
                set('Content-Type', 'application/json').
                send(updates).
                expect(200).
                end(function(err, res) {
                    should.not.exist(err);
                    res.body.data['first-name'].should.be.equal('&lt;script>Watermelon&lt;/script>');
                    res.body.data['last-name'].should.be.equal('&lt;script>alert("xss")&lt;/script>');
                    res.body.data.address.state.should.be.equal('&lt;script>alert("xss")&lt;/script>');
                    res.body.data.address.city.should.be.equal('Atlantic');
                    done();
                });
            });

            it('should sanitize selected fields', function(done) {
                const id = users[0]._id;
                const updates = {
                    data: {
                        id: id,
                        attributes: {
                            'first-name': '<script>Watermelon</script>',
                            'last-name': '<script>alert("xss")</script>'
                        }
                    }
                };

                request(app.getExpressApplication()).
                patch('/users/' + id).
                set('Content-Type', 'application/json').
                send(updates).
                expect(200).
                end(function(err, res) {
                    should.not.exist(err);
                    res.body.data.name.first.should.be.equal('&lt;script>Watermelon&lt;/script>');
                    // last name should not be sanitized as per config
                    res.body.data.name.last.should.be.equal('<script>alert("xss")</script>');
                    done();
                });
            });

            it('should not sanitize when it is inactive', function(done) {
                const id = admins[0]._id;
                const updates = {
                    data: {
                        id: id,
                        attributes: {
                            'first-name': '<script>Watermelon</script>',
                            'last-name': '<script>alert("xss")</script>'
                        }
                    }
                };

                request(app.getExpressApplication()).
                patch('/managers/' + id).
                set('Content-Type', 'application/json').
                send(updates).
                expect(200).
                end(function(err, res) {
                    should.not.exist(err);
                    res.body.data['first-name'].should.be.equal('<script>Watermelon</script>');
                    res.body.data['last-name'].should.be.equal('<script>alert("xss")</script>');
                    done();
                });
            });
        });
    });
});
