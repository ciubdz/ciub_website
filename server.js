const express = require("express");
const app = express();
let http = require('http');

let session = require("express-session")(
{
    secret: "my-secret",
    saveUninitialized: true,
    resave: true
});

let iosession = require("express-socket.io-session");

let server = http.createServer(app);

let io = require("socket.io").listen(server);

let dep = ["Developement", "Communication", "Design", "Marketing"];

/* Temporary table instead of using an DBMS */
let users = {

    "161631031417": 
    {
        fname: "Anis",
        lname: "ROUANE",
        pass: "abdou2013",
        dep: dep[0]
    }
}; 


/* To be able to load external data into my ejs files */
app.use(express.static(__dirname+'/public'));

/* The session we will use for the current user */
app.use(session);

/* To share the sessions between my request page and sockets */
io.use(iosession(session));

/* Root page (the index) */
app.get("/", function(req, res, next)
{
    /* Check for the session if there is any stored data inside user variable */
    if(typeof(req.session.user) == "undefined")
    {
        res.redirect('/login');
    }
    else
    {
        res.render("acc.ejs");
    }
});

app.get("/login", function(req, res)
{   
    if(typeof(req.session.user) == "undefined")
    {
        res.render('con.ejs');
    }
    else
    {
        res.redirect("/");
    }
});

/* Get the page called profile, send the id as link param */
app.get("/profile/:id", function(req, res)
{
    /* if the user is not signed in goes back to the login page */
    if(typeof(req.session.user) == "undefined")
    {
        res.redirect('/login');
    }
    else
    {
        let exists = false; //will help me check if the user exists or not
        let isme = false; //will tell me is this is my own profile or not
        let user; //will hold the informations of the user to be displayed

        /* Check if the id of the link param is == to the current logged user */
        if(req.params.id == req.session.user)
        {
            isme = true;
        }

        /* Check if the current user exists in my users table */
        if(typeof(users[req.params.id]) != "undefined")
        {
            user = {
                id: req.params.id,
                fname: users[req.params.id].fname,
                lname: users[req.params.id].lname,
                dep: users[req.params.id].dep,
            }

            exists = true;
        }

        /* Render the page and send informations to client */
        res.render("pro.ejs", 
        {
            exists: exists,
            isme: isme, 
            user: user
        });
    }
});

/* Event to check if the client connected into the server */
io.sockets.on('connection', function(socket)
{
    /* Check if a user is already logged in */
    if(typeof(socket.handshake.session.user) == "undefined")
    {
        /* 
            If my user is not logged, then wait for a signal that is called login which holds
           the datas inside a json
        */
        socket.on("login", function(infos)
        {
            if(!infos.pass.match(/[A-Za-z0-9]{1}/))
            {
                socket.emit("input-error", 
                {
                    id:"#pass",
                    message: "Please, enter a valid password"
                });
            }

            /* Check if the id number notation is correct using a regular exp */
            if(infos.mat.match(/[A-Za-z]{1}1[0-5]{1}[0-9]{4}|1[6-9]1[6-9]3[1-6]{1}0[1-9]{1}[0-9]{4}/))
            {
                /* check if the id sent is available in my users table  */
                if(typeof(users[infos.mat]) == "undefined")
                {
                    socket.emit("input-error", 
                    {
                        id:"#mat",
                        message: "This ID number is not a member of the club."
                    });
                }
                else
                {
                    /* Check the password matching */
                    if(users[infos.mat].pass != infos.pass)
                    {
                        socket.emit("input-error", 
                        {
                            id:"#pass",
                            message: "Wrong password..."
                        });
                    }
                    else
                    {
                        /* if he can log in, save the socket session */
                        socket.handshake.session.user = infos.mat;
                        socket.handshake.session.save();
                        socket.emit('redirect', "/login");
                    }
                }
            }
            else
            {
                /* Send a signal that's called error in case of any wrong infos */
                socket.emit("input-error", 
                {
                    id:"#mat",
                    message: "Please, enter a valid ID student number"
                });
            }
        }); 
    }
});

server.listen(3000, function()
{
    console.log("Server on: 3000");
});
