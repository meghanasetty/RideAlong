path = require('path');
var fs = require('fs');
var express = require('express');
var router = express.Router();
var databaseConfig = require('../helper/database');
var url = require('url');
var util = require('../helper/util');
var multer  = require('multer')
var upload = multer({ dest: 'uploads/' })
var gcm = require('android-gcm');
var gcmObject = new gcm.AndroidGcm('AIzaSyA9Nqs4IkVcY5lSCSm20tent42dEdyZCFs');

/************TRACKING**********************************/
router.post('/track',function(req,res){
    var helperid = req.body.helperid;
    var x = req.body.x;
    var y = req.body.y;
    var askerid = req.body.askerid;
    var type = req.body.type;
    var contact = req.body.contact;
    var message = req.body.message;
    var username = req.body.username;
    var message = new gcm.Message({
        'registration_ids':[helperid],
        "data" : {
            "message":message,
            "type":type,
            "helperid": helperid,
            "askerid": askerid,
            "username": username,
            "contact":contact,
            "x": x,
            "y":y
        }
    });
    gcmObject.send(message, function(err, response) {
        if(err != null)
            console.log(err);
        console.log(JSON.stringify(response));
    });
    res.send('{status: 200}');
});


/*********GET USER FRIENDS POST LIST**************/
router.get('/user/friends/post', function(req, res, next) {
//    res.setHeader('Content-Type', 'application/json');
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    var userpost={};
    userpost.posts = [];
    selectTable = "SELECT * FROM " + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userTableColums.contact + " = '" + query.contact + "'" ;
    databaseConfig.pool.getConnection(function(err, connection) {
        if (err != null) {
            console.log('error in getting location: ' + err);
            res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
        }
        connection.query(selectTable, function (err, rows) {
            if (err != null) {
                console.log('error in getting location: ' + err);
                res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
            }else if(rows!=undefined && rows.length){
                var selectPosts = "SELECT * FROM " + databaseConfig.userPostTable.tableName + " where " + databaseConfig.userPostTable.id + " in (" + "SELECT distinct  friendslistable.id FROM (SELECT distinct id,username,contact,lastlocation  from ( SELECT friendone,friendtwo FROM " + databaseConfig.userTableColums.tableName + "," + databaseConfig.userFriendColums.tableName + " where " + databaseConfig.userTableColums.tableName + ".id = " + rows[0].id + " and ((" + databaseConfig.userTableColums.tableName + ".id = " + databaseConfig.userFriendColums.tableName + ".friendone) or (" + databaseConfig.userTableColums.tableName + ".id = " + databaseConfig.userFriendColums.tableName + ".friendtwo))) as friendslist," + databaseConfig.userTableColums.tableName + " where (" + databaseConfig.userTableColums.tableName + ".id = friendslist.friendone or " + databaseConfig.userTableColums.tableName + ".id = friendslist.friendtwo)) AS  friendslistable," + databaseConfig.userPostTable.tableName + " WHERE friendslistable.id = " + databaseConfig.userPostTable.tableName + ".id" + ") ORDER BY timestamp desc";

                connection.query(selectPosts, function (err, rows) {
                    if (err != null) {
                        console.log('error in getting location: ' + err);
                        res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
                    }

                    console.log(rows);
                    if (rows != undefined && rows.length) {
                        postlist = rows;
                        console.log(rows);
                        postlist.forEach(function (post, indexpost) {
                            var selectImages = "SELECT * FROM " + databaseConfig.userPostImageTable.tableName + "," + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userPostImageTable.postID + " = '" + post.postid + "' and " + databaseConfig.userTableColums.id + " = '" + post.id + "'";
                            connection.query(selectImages, function (err, rows) {
                                friend = rows[0];
                                postInfo = {};
                                postInfo.contact = friend.contact;
                                postInfo.username = friend.username;
                                postInfo.lastlocation = friend.lastlocation;
                                postInfo.title = post.title;
                                postInfo.description = post.description;
                                postInfo.location = post.location;
                                postInfo.postid = post.postid;
                                postInfo.timestamp = post.timestamp;
                                if (err != null) {
                                    console.log('error in getting location: ' + err);
                                    res.send(JSON.stringify({
                                        status: 500,
                                        message: "error in communicating server"
                                    }, null, 3));
                                }
                                imageUrls = [];
                                if (rows != undefined && rows.length) {
                                    rows.forEach(function (image, index1) {
                                        imageUrls.push(image.imagelocation);
                                    });
                                }
                                postInfo.imageUrls = imageUrls;
                                userpost.posts.push(postInfo);
                                if (indexpost == postlist.length - 1) {

                                    connection.release();
                                    res.send(userpost);
                                }
                            });
                        });
                    } else {
                        res.send(JSON.stringify({
                            status: 200,
                            message: "no posts to retirve"
                        }, null, 3));

                    }
                });
            }else{
                res.send(JSON.stringify({
                    status: 200,
                    message: "no posts to retirve"
                }, null, 3));

            }


        });
    });
});


router.get('/online', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    databaseConfig.pool.getConnection(function(err, connection) {
        if(err != null){
            console.log('error in register: '+err);
            res.send(JSON.stringify({ status: 500 ,message:"error in communicating server" }, null, 3));
        }else {
            if (req.query.contact == undefined) {
                res.send(JSON.stringify({status: 500, message: "invalid data"}, null, 3));
            }else {
                if (true) {
                        usergcmkey = req.query.gcmkey;
                        selectTable = "SELECT * FROM (SELECT distinct gcmkey,id,isregistered,username,contact,lastlocation  from ( SELECT friendone,friendtwo FROM userinfo,friendtable where (userinfo.contact = " + req.query.contact + " and userinfo.isregistered = 1)and ((userinfo.id = friendtable.friendone) or (userinfo.id = friendtable.friendtwo))) as friendslist,userinfo where (userinfo.id = friendslist.friendone or userinfo.id = friendslist.friendtwo)) as friend WHERE friend.isregistered = 1";
                        connection.query(selectTable, function (err, rows) {
                            if (err != null) {
                                console.log("error in selecting : " + err);
                                res.send(JSON.stringify({
                                    status: 500,
                                    message: "error in comunicating server"
                                }, null, 3));
                            } else {
                                if (rows != undefined && rows.length) {
                                    type = "reqonline";
                                    rows.forEach(function (friend, index) {
                                        var message = new gcm.Message({
                                            'registration_ids': [friend.gcmkey],
                                            "data": {
                                                "message": message,
                                                "type": type,
                                                "helperid": friend.gcmkey,
                                                "askerid": usergcmkey,
                                                "username": friend.username,
                                                "contact": friend.contact,
                                                "x": "x",
                                                "y": "y"
                                            }
                                        });
                                        gcmObject.send(message, function (err, response) {
                                        temp =  {
                                            "message": message,
                                            "type": type,
                                            "helperid": friend.gcmkey,
                                            "askerid": usergcmkey,
                                            "username": friend.username,
                                            "contact": friend.contact,
                                            "x": "x",
                                            "y": "y"
                                        };
                                            if (err != null)
                                                console.log(err+" : ");
                                            console.log(JSON.stringify(response)+" : "+JSON.stringify(temp));
                                        });

                                    });
                                    res.send(JSON.stringify({
                                        status: 200,
                                        message: "online freinds",
                                        friends: rows
                                    }, null, 3));
                                } else {
                                    res.send(JSON.stringify({
                                        status: 500,
                                        message: "unable to find online freinds",
                                        friends: rows
                                    }, null, 3));

                                }

                            }
                        });
                    }else {
                        res.send(JSON.stringify({status: 500, message: "invalid data"}, null, 3));

                    }
            }
        }
        });

});
/***********EXPERIENCE GETTING****************/
    router.get('/user/post', function(req, res, next) {
//    res.setHeader('Content-Type', 'application/json');
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    var userpost={};
    userpost.posts = [];
    selectTable = "SELECT * FROM " + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userTableColums.contact + " = '" + query.contact + "'" ;
    databaseConfig.pool.getConnection(function(err, connection) {
        if (err != null) {
            connection.release();
            console.log('error in getting location: ' + err);
            res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
        }
        connection.query(selectTable, function (err, rows) {
            completeuserinfo = rows;
            if (err != null) {
                console.log('error in getting location: ' + err);
                res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
            }
            if (rows[0] != undefined && rows[0].isregistered) {
                var selectPosts = "SELECT * FROM "+databaseConfig.userPostTable.tableName+" where "+databaseConfig.userPostTable.id+" = '"+rows[0].id+"'";
                connection.query(selectPosts, function (err, rows) {
                    if (err != null) {
                        console.log('error in getting location: ' + err);
                        res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
                    }
                    if (rows[0] != undefined && rows.length) {
                        var postArray = [];
                        postlist = rows;
                        postlist.forEach(function (post, index) {
                            var selectImages = "SELECT * FROM "+databaseConfig.userPostImageTable.tableName+" where "+databaseConfig.userPostImageTable.postID+" = "+post.postid+"";
                            connection.query(selectImages, function (err, rows) {
                                postInfo={};
                                postInfo.title = post.title;
                                postInfo.description = post.description;
                                postInfo.location = post.location;
                                postInfo.postid = post.postid;
                                postInfo.username =completeuserinfo[0].username;
                                postInfo.timestamp = post.timestamp;
                                if (err != null) {
                                    console.log('error in getting location: ' + err);
                                    res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
                                }
                                imageUrls = [];
                                if (rows[0] != undefined && rows.length) {
                                    rows.forEach(function(image,index1){
                                        imageUrls.push(image.imagelocation);
                                    });
                                }
                                postInfo.imageUrls = imageUrls;
                                userpost.posts.push(postInfo);
                                if(index == postlist.length -1 ) {
                                    console.log(userpost);
                                    res.send(userpost);

                                }
                            });

                        });
                    }else{
                        res.setHeader('Content-Type', 'application/json');
                        res.send(JSON.stringify({status: 500, message: 'no posts to retrive'}));
                    }
                });
            }else{
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({status: 500, message: 'invalid credentails'}));
            }
        });
    });
});

/***********DOWNLOADING POST*******************/
router.get('/image/download',  upload.any(), function (req, res, next) {
    var url_parts = url.parse(req.url, true);
    var query = url_parts.query;
    selectTable = "SELECT * FROM " + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userTableColums.contact + " = '" + query.contact + "'" ;
    databaseConfig.pool.getConnection(function(err, connection) {
        if (err != null) {
            console.log('error in getting location: ' + err);
            res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
        }
        connection.query(selectTable, function (err, rows) {
            if (err != null) {
                console.log('error in getting location: ' + err);
                res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
            }

            if (rows[0] != undefined && rows[0].isregistered) {
                var dir = "uploads";
                var filename = query.src;
                console.log(dir + "\\" + filename);
                var filePath = dir + "\\" + filename;
                if (fs.existsSync(filePath)) {
                    var stat = fs.statSync(filePath);
                    res.writeHead(200, {
                        'Content-Type': 'image/jpg',
                        'Content-Length': stat.size
                    });
                    var readStream = fs.createReadStream(filePath);
                    readStream.pipe(res);
                } else {
                    res.setHeader('Content-Type', 'application/json');
                    res.send(JSON.stringify({status: 500, message: 'unable to load image'}));
                }
            } else {
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({status: 500, message: 'invalid credentails'}));
            }
        });
    });
});
/***********EXPERIENCE POSTING**************/
router.post('/post',  upload.any(), function (req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    console.log(req.body.contact);
    selectTable = "SELECT * FROM " + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userTableColums.contact + " = '" + req.query.contact + "'" + " or  " + databaseConfig.userTableColums.gcm + " = '" + req.query.gcmkey + "'";
    console.log(selectTable);
    databaseConfig.pool.getConnection(function(err, connection) {
        if (err != null) {
            console.log('error in getting location: ' + err);
            res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
        }
        else {
            connection.query(selectTable, function (err, rows) {

                if (err != null) {
                    console.log("error in selecting : " + err);
                    res.send(JSON.stringify({status: 500, message: "error in comunicating server"}, null, 3));
                }
                else if (rows != undefined && rows.length && rows[0].isregistered) {
                    console.log(rows[0].id+"");
                    var userid = rows[0].id;
                    var insertPost = "INSERT INTO " + databaseConfig.userPostTable.tableName + "(" +
                        databaseConfig.userPostTable.title + "," + databaseConfig.userPostTable.description + "," +
                        databaseConfig.userPostTable.location + "," +
                        databaseConfig.userPostTable.id + ") VALUES ('" + req.body.title + "','" + req.body.description + "','" +
                        req.body.location + "'," + userid +")";
                    console.log(insertPost);
                    connection.query(insertPost, function (err, rows) {
                        if (err != null) {
                            console.log("error in selecting : " + err);
                            res.send(JSON.stringify({status: 500, message: "error in comunicating server"}, null, 3));
                        }
                        var timestampTable="select max("+databaseConfig.userPostTable.postId+") as postid from "+databaseConfig.userPostTable.tableName;
                        connection.query(timestampTable, function (err, rows) {
                            if (err != null) {
                                console.log("error in selecting : " + err);
                                res.send(JSON.stringify({
                                    status: 500,
                                    message: "error in comunicating server"
                                }, null, 3));
                            }
                            var imagecount = 0;
                            console.log(rows[0].postid);
                            if(req.files.length == 0 ){
                                res.send(JSON.stringify({status:200,message:"post updated with out image"}));

                            }else
                                req.files.forEach(function (file, index) {
                                    var insertImage = "INSERT INTO "+databaseConfig.userPostImageTable.tableName+"("+
                                        databaseConfig.userPostImageTable.imageLocation+","+databaseConfig.userPostImageTable.postID+") VALUES('"+
                                        file.filename+"',"+rows[0].postid+")";
                                    connection.query(insertImage, function (err, rows) {
                                        if (err != null) {
                                            console.log("error in selecting : " + err);
                                            res.send(JSON.stringify({
                                                status: 500,
                                                message: "error in updating images"
                                            }, null, 3));
                                        }
                                        imagecount++;
                                        if(imagecount == req.files.length){
                                            res.send(JSON.stringify({status:200,message:"images and post updated"}));
                                        }
                                    });
                                });

                        });
                    });
                }else{
                    res.send(JSON.stringify({status:500,message:"unable to upload"}));

                }
            });
        }
    });

});

router.get('/check', function(req, res, next) {
        res.setHeader('Content-Type', 'application/json');
        res.send(JSON.stringify({ status: 200 }, null, 3));
    }
);
router.post('/user/friendslist/location', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    console.log(req.body.data);
    databaseConfig.pool.getConnection(function(err, connection) {
        if (err != null) {
            console.log('error in getting location: ' + err);
            res.send(JSON.stringify({status: 500, message: "error in communicating server"}, null, 3));
        } else {
            /*****NEED TO VALIDATE ************/
            /*        if (!util.validateRegister(req.body.data))
             res.send(JSON.stringify({status: 500, message: "invalid data"}, null, 3));
             else       */
            {
                selectTable = "SELECT * FROM " + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userTableColums.contact + " = '" + req.body.data.contact + "'" + " or  " + databaseConfig.userTableColums.gcm + " = '" + req.body.data.gcmkey + "'";
                connection.query(selectTable, function (err, rows) {
                    if (err != null) {
                        console.log("error in selecting : " + err);
                        res.send(JSON.stringify({status: 500, message: "error in comunicating server"}, null, 3));
                    }
                    else if (rows!=undefined && rows.length) {
                        selectTable = "SELECT * FROM " + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userTableColums.contact + " = '" + req.body.data.friendcontact + "'";// + " or  " + databaseConfig.userTableColums.gcm + " = '" + req.body.data.friendcontactgcmkey + "'";
                        connection.query(selectTable, function (err, rows) {
                            if (err != null) {
                                console.log("error in selecting : " + err);
                                res.send(JSON.stringify({status: 500, message: "error in comunicating server"}, null, 3));
                            }
                            else if (rows!=undefined && rows.length) {
                                connection.release();
                                console.log(rows[0].lastlocation);
                                res.send(JSON.stringify({status: 200, location: rows[0].lastlocation}));
                            }else{
                                connection.release();
                                res.send(JSON.stringify({status: 500,message: "invalid credentials"}));
                            }
                        });
                    }else {
                        connection.release();
                        res.send(JSON.stringify({status: 500, message: "invalid credentials"}));
                    }
                });
            }
        }
    });
});
router.post('/user/update', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    databaseConfig.pool.getConnection(function(err, connection) {
        if (err != null) {
            console.log('error in updating: ' + err);
            res.send(JSON.stringify({status: 500, message: "error in updating/communicating server"}, null, 3));
        } else {
            console.log("registering " + req.body.data.username);
            if (!util.validateRegister(req.body.data))
                res.send(JSON.stringify({status: 500, message: "invalid data"}, null, 3));
            else {
                selectTable = "SELECT * FROM " + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userTableColums.contact + " = '" + req.body.data.contact + "'" + " or  " + databaseConfig.userTableColums.gcm + " = '" + req.body.data.gcmkey + "'";
                connection.query(selectTable, function (err, rows) {
                    if (err != null) {
                        console.log("error in selecting : " + err);
                        res.send(JSON.stringify({status: 500, message: "error in comunicating server"}, null, 3));
                    }
                    else if (rows!= undefined && rows.length) {
                        updateTable = "UPDATE " + databaseConfig.userTableColums.tableName + " SET " +
                            databaseConfig.userTableColums.contact + " = '" + req.body.data.contact + "'," +
                            databaseConfig.userTableColums.gcm + " = '" + req.body.data.gcmkey + "'," +
                            databaseConfig.userTableColums.isRegistered + " = 1," +
                            databaseConfig.userTableColums.lastLocation + " = '" + req.body.data.lastlocation + "'," +
                            databaseConfig.userTableColums.userName + " = '" + req.body.data.username + "'," +
                            databaseConfig.userTableColums.shareStatus + " = '" + req.body.data.sharestatus + "'" +
                            "WHERE " + databaseConfig.userTableColums.contact + " = '" + req.body.data.contact + "'";
                        connection.query(updateTable, function (err, rows) {
                            if (err != null) {
                                connection.release();
                                res.send(JSON.stringify({
                                    status: 500,
                                    message: "error in communicating with server " + err
                                }, null, 3));
                            } else {
                                connection.release();
                                res.send(JSON.stringify({status: 200, message: "update successfully"}));
                            }
                        });
                    }else {
                        connection.release();
                        res.send(JSON.stringify({status: 500, message: "user does not exists"}));
                    }
                });
            }
        }
    });
});
router.post('/user/register', function(req, res, next) {
    res.setHeader('Content-Type', 'application/json');
    console.log(req.body.data.gcmkey);
    databaseConfig.pool.getConnection(function(err, connection) {
        if(err != null){

            console.log('error in register: '+err);
            res.send(JSON.stringify({ status: 500 ,message:"error in communicating server" }, null, 3));
        }else{
            console.log("registering "+JSON.stringify(req.body.data));
            if(!util.validateRegister(req.body.data))
                res.send(JSON.stringify({ status: 500 ,message:"invalid data" }, null, 3));
            else{
                insertTable = "INSERT INTO "+databaseConfig.userTableColums.tableName+"(" +
                    databaseConfig.userTableColums.contact+","+databaseConfig.userTableColums.gcm+","+databaseConfig.userTableColums.isRegistered+","+databaseConfig.userTableColums.userName+","+databaseConfig.userTableColums.shareStatus+","+databaseConfig.userTableColums.lastLocation+","+databaseConfig.userTableColums.isOnline+")"+
                    "values('"+req.body.data.contact+"','"+req.body.data.gcmkey+"','"+1+"','"+req.body.data.username+"','"+1+"','"+req.body.data.lastlocation+"',1"+");"
                ;
                selectTable = "SELECT * FROM "+databaseConfig.userTableColums.tableName+" where "+databaseConfig.userTableColums.contact +" = '"+req.body.data.contact+"'"+" or  "+databaseConfig.userTableColums.gcm +" = '"+req.body.data.gcmkey+"'";
                connection.query( selectTable, function(err, rows) {
                    if(err != null){
                        console.log("error in selecting : "+err);
                        res.send(JSON.stringify({ status: 500 ,message:"error in comunicating server" }, null, 3));
                    }
                    console.log(rows);
                    if(rows!=undefined && rows.length && rows[0].isregistered!=undefined && rows[0].isregistered == 0){
                        updateTable= "UPDATE "+databaseConfig.userTableColums.tableName+" SET "+
                            databaseConfig.userTableColums.isRegistered +" = 1,"+
                            databaseConfig.userTableColums.lastLocation +" = '"+req.body.data.lastlocation+"',"+
                            databaseConfig.userTableColums.userName +" = '"+req.body.data.username+"',"+
                            "gcmkey" +" = '"+req.body.data.gcmkey+"',"+
                            databaseConfig.userTableColums.shareStatus +" = '"+1+"'"+
                            "WHERE "+databaseConfig.userTableColums.contact +" = '"+req.body.data.contact+"'";
                        connection.query( updateTable, function(err, rows) {
                            if (err != null) {
                                console.log('error in register: '+err);
                                connection.release();
                                res.send(JSON.stringify({
                                    status: 500,
                                    message: "error in communicating with server " + err
                                }, null, 3));
                            } else {
                                var message = new gcm.Message({
                                    'registration_ids':[req.body.data.gcmkey],
                                    "data" : {
                                        "type":"registration",
                                        "message":"registration is done updating the contacts"
                                    }
                                });
                                gcmObject.send(message, function(err, response) {
                                    if(err != null)
                                        console.log(err);
                                    console.log(JSON.stringify(response));
                                });
                                connection.release();
                                console.log("registration succ");
                                res.send(JSON.stringify({status: 200, message: "registration successfully"}));
                            }
                        });
                    }else
                    if(rows!=undefined && !rows.length){
                        connection.query( insertTable, function(err, rows) {
                            if(err != null){
                                console.log('error in register: '+err);
                                connection.release();
                                res.send(JSON.stringify({ status: 500 ,message:"error in communicating with server "+err }, null, 3));
                            }else {
                                var message = new gcm.Message({
                                    'registration_ids':[req.body.data.gcmkey],
                                    "data" : {
                                        "type":"registration",
                                        "message":"registration is done updating the contacts"
                                    }
                                });
                                gcmObject.send(message, function(err, response) {
                                    if(err != null)
                                        console.log(err);
                                    console.log(JSON.stringify(response));
                                });
                                connection.release();
                                res.send(JSON.stringify({status: 200, message: "registration successfully"}));
                            }
                        });
                    }else{
                        var message = new gcm.Message({
                            'registration_ids':[req.body.data.gcmkey],
                            "data" : {
                                "type":"registration",
                                "message":"registration is done updating the contacts"
                            }
                        });
                        gcmObject.send(message, function(err, response) {
                            if(err != null)
                                console.log(err);
                            console.log(JSON.stringify(response));
                        });
                        console.log('error in register: '+err);
                        connection.release();
                        res.send(JSON.stringify({ status: 500 ,message:"user already exists" }, null, 3));
                    }
                });
            }
        }
    });
});
router.post('/user/friends', function(req, res, next) {
    {
        var friendscount = 0;
        res.setHeader('Content-Type', 'application/json');
        flag = true;
        databaseConfig.pool.getConnection(function(err, connection) {
            selectTable = "SELECT * FROM " + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userTableColums.contact + " = '" + req.body.data.contact + "'";
            connection.query(selectTable, function (err, rows) {
                if(!rows.length){
                    flag = false;
                    console.log(err);
                    connection.release();
                    res.send(JSON.stringify({status: 500,message: "invalid credentials "}, null, 3));
                }else {
                    var userId = rows[0].id;
                    friendslist = req.body.data.friendslist;
                    if (friendslist != undefined) {
                        friendslist.forEach(function (friend, index) {
                            selectTable = "SELECT * FROM " + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userTableColums.contact + " = '" + friend.contact + "'";
                            connection.query(selectTable, function (err, rows) {
                                var friendId = rows.length;
                                if (err != null) {
                                    flag = false;
                                    connection.release();
                                    console.log(err);
                                    res.send(JSON.stringify({
                                        status: 500,
                                        message: "server internal error failed to update " + err
                                    }, null, 3));
                                } else {
                                    if (rows.length != 0)
                                        friendId = rows[0].id;
                                    if (rows.length == 0) {
                                        //new register
                                        friendcontact = friend.contact.replace(/ /g, '').replace(/-/g, '').replace("+91", '');
                                        console.log(friendcontact);
                                        insertTable = "INSERT INTO " + databaseConfig.userTableColums.tableName + "(" +
                                            databaseConfig.userTableColums.userName + "," + databaseConfig.userTableColums.contact + "," + databaseConfig.userTableColums.isRegistered + "," + databaseConfig.userTableColums.shareStatus + ")" +
                                            "values('" + friend.username + "','" + friendcontact + "','" + 0 + "','" + 0 + "');"
                                        ;
                                        connection.query(insertTable, function (err, rows) {
                                            if (err != null) {
                                                flag = false;
                                                console.log(err);
                                            } else {
                                                selectTable = "SELECT * FROM " + databaseConfig.userTableColums.tableName + " where " + databaseConfig.userTableColums.contact + " = '" + friend.contact + "'";
                                                connection.query(selectTable, function (err, rows) {
                                                    if (err != null || rows == undefined) {
                                                        flag = false;
                                                        console.log(err);
                                                        connection.release();
                                                        res.send(JSON.stringify({
                                                            status: 500,
                                                            message: "?server internal error failed to update "
                                                        }, null, 3));
                                                    } else if (rows != undefined && rows.length) {
                                                        console.log(rows);
                                                        insertTable = "INSERT INTO " + databaseConfig.userFriendColums.tableName + "(" +
                                                            databaseConfig.userFriendColums.friendOne + "," + databaseConfig.userFriendColums.friendTwo + "," + databaseConfig.userFriendColums.shareStatusOneTwo + "," + databaseConfig.userFriendColums.shareStatusTwoOne + ")" +
                                                            "values('" + userId + "','" + rows[0].id + "','" + friend.share + "','" + 0 + "');"
                                                        ;
                                                        connection.query(insertTable, function (err, rows) {
                                                            if (err != null) {
                                                                connection.release();
                                                                res.send(JSON.stringify({
                                                                    status: 500,
                                                                    message: "server internal error failed to update " + err
                                                                }, null, 3));
                                                            }
                                                            friendscount++;
                                                            if (friendscount == req.body.data.friendslist.length) {
                                                                connection.release();

                                                                console.log("data send to client");
                                                                res.send(JSON.stringify({
                                                                    status: 200,
                                                                    message: "updated friends list",
                                                                    count: friendscount
                                                                }, null, 3));
                                                            }
                                                        });
                                                    }
                                                });
                                            }
                                        });
                                    } else {
                                        flag = true;
                                        selectTable = "SELECT * FROM " + databaseConfig.userFriendColums.tableName + " where (" + databaseConfig.userFriendColums.friendOne + " = '" + friendId + "' AND " + databaseConfig.userFriendColums.friendTwo + " = '" + userId + "' ) OR (" + databaseConfig.userFriendColums.friendTwo + " = '" + friendId + "' AND " + databaseConfig.userFriendColums.friendOne + " = '" + userId + "' )";
                                        connection.query(selectTable, function (err, rows) {
                                            if (err != null) {
                                                connection.release();
                                                res.send(JSON.stringify({
                                                    status: 500,
                                                    message: "server internal error failed to update " + err
                                                }, null, 3));
                                            } else {
                                                if (rows.length == 0) {
                                                    insertTable = "INSERT INTO " + databaseConfig.userFriendColums.tableName + "(" +
                                                        databaseConfig.userFriendColums.friendOne + "," + databaseConfig.userFriendColums.friendTwo + "," + databaseConfig.userFriendColums.shareStatusOneTwo + "," + databaseConfig.userFriendColums.shareStatusTwoOne + ")" +
                                                        "values('" + userId + "','" + friendId + "','" + friend.share + "','" + 0 + "');"
                                                    ;
                                                    connection.query(insertTable, function (err, rows) {
                                                        if (err != null) {
                                                            connection.release();
                                                            res.send(JSON.stringify({
                                                                status: 500,
                                                                message: "server internal error failed to update " + err
                                                            }, null, 3));
                                                        }
                                                        friendscount++;
                                                        if (friendscount == req.body.data.friendslist.length) {
                                                            connection.release();
                                                            res.send(JSON.stringify({
                                                                status: 200,
                                                                message: "updated friends list",
                                                                count: friendscount
                                                            }, null, 3));
                                                        }
                                                    });
                                                } else {
                                                    if (rows[0].friendone == userId)
                                                        rows[0].sharestatusonetwo = friend.share;
                                                    else
                                                        rows[0].sharestatustwoone = friend.share;
                                                    updatetable = "UPDATE " + databaseConfig.userFriendColums.tableName + " SET " +
                                                        databaseConfig.userFriendColums.shareStatusOneTwo + " = " + rows[0].sharestatusonetwo + "," +
                                                        databaseConfig.userFriendColums.shareStatusTwoOne + " = " + rows[0].sharestatustwoone +
                                                        " WHERE (" + databaseConfig.userFriendColums.friendOne + " = '" + friendId + "' AND " + databaseConfig.userFriendColums.friendTwo + " = '" + userId + "' ) OR (" + databaseConfig.userFriendColums.friendTwo + " = '" + friendId + "' AND " + databaseConfig.userFriendColums.friendOne + " = '" + userId + "' )";
                                                    connection.query(updatetable, function (err, rows) {
                                                        if (err != null) {
                                                            connection.release();
                                                            res.send(JSON.stringify({
                                                                status: 500,
                                                                message: "server internal error failed to update " + err
                                                            }, null, 3));
                                                        }else {

                                                            friendscount++;
                                                            if (friendscount == req.body.data.friendslist.length) {
                                                                connection.release();
                                                                res.send(JSON.stringify({
                                                                    status: 200,
                                                                    message: "updated friends list",
                                                                    count: friendscount
                                                                }, null, 3));
                                                            }
                                                        }
                                                    });
                                                }
                                            }
                                        });
                                    }
                                }
                            });
                        });
                    }else{
                        connection.release();
                        res.send(JSON.stringify({
                            status: 500,
                            message: "empty friends list",
                            count: friendscount
                        }, null, 3));

                    }
                }
            });
        });
    }
});
module.exports = router;
