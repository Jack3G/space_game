var c = document.getElementById("canvas")
var ctx = c.getContext("2d")
var input = new Pinput()
c.width = 800
c.height = 600

let mousepos = {x:0,y:0}
document.onmousemove = (e) => {
    let r = c.getBoundingClientRect()
    mousepos = {
	    x: e.clientX - r.left,
	    y: e.clientY - r.top
    }
}

ctx.imageSmoothingEnabled = false
ctx.font = "40px Arial"


const COLOUR_BG = "#000"

const ENEMY_SPAWN_CHANCE = 120 // if rng is 0 each frame
const PARTICLE_LASER_CHANCE = 20
const PLAYER_SHOOT_TIMER = 60 // in frames... also set this to 1 it looks really cool :)
const PLAYER_INVULN_TIMER = 2 // seconds
const THING_SIZE = 32

const TO_RAD = Math.PI / 180

const ENEMY_TYPES = [
    {texture: "badguy1", speed: 1},
    {texture: "badguy2", speed: 2},
    {texture: "badguy3", speed: 1, shootchance: 60}
]


function rngInt(max) {
    return Math.floor(Math.random() * max)
}
function rng(max) {
    return Math.random() * max
}

var assets

function preload(assetList) {
    assets = {}
    Object.keys(assetList).forEach(e => {
	    assets[e] = ""
    })

    Object.keys(assetList).forEach(e => {
	    let img = new Image()
	    img.src = assetList[e]
	    assets[e] = [img, false]

	    img.addEventListener("load", () => {
	        assets[e][1] = true
	    })
    })
}

function drawImage(image,x,y,w,h,isCentre/*sX,sY,sW,sH*/) {
    if (assets[image] !== undefined && assets[image][1] === true) {
	    if (h !== undefined && w !== undefined) {
	        if (isCentre) {
		        x-=w/2
		        y-=h/2
	        }
	        ctx.drawImage(assets[image][0],x,y,w,h)
	        return
	    }
	    if (isCentre) {
	        x -= assets[image][0].width/2
	        y -= assets[image][0].height/2
	    }
	    ctx.drawImage(assets[image][0], x, y)
    } else {
	    ctx.fillStyle = "#f0f"
	    ctx.fillRect(isCentre?x-w/2:x,isCentre?y-h/2:y,w,h)
    }
}

// function collideRectPoint(x1,y1,w1,h1,x2,y2) {
//     if (x2>x1 && y2>y1 && x2<x1+w1 && y2<y1+h1)
// 	return true
//     else
// 	return false
// }

// function collideRectRect(x1,y1,w1,h1,x2,y2,w2,h2) {
//     return collideRectPoint(x1,y1,w1,h1,x2,y2) ||
//     collideRectPoint(x1,y1,w1,h1,x2+w2,y2) ||
//     collideRectPoint(x1,y1,w1,h1,x2,y2+h2) ||
//     collideRectPoint(x1,y1,w1,h1,x2+w2,y2+h2)
// }
function collideRectRect(x1,y1,w1,h1,x2,y2,w2,h2) {
    if (x1 < x2+w2 && x1+w1 > x2 && y1 < y2+h2 && y1+h1 > y2)
	    return true
    else
	    return false
}


class Component {
    constructor(tex,x,y,w,h) {
	    this.tex=tex
	    this.x=x
	    this.y=y
	    this.w=w===undefined?32:w
	    this.h=h===undefined?32:h
    }

    draw() {
	    drawImage(this.tex,this.x,this.y,this.w,this.h)
    }
}

class Paralax extends Component {
    constructor(tex,x,y,w,h,speed) {
	    super(tex,x,y,w,h)
	    this.speed=speed
    }

    update() {
	    this.x-=this.speed

	    if (this.x<-this.w)
	        this.x=0
    }

    draw() {
	    drawImage(this.tex,this.x,this.y,this.w,this.h)
	    drawImage(this.tex,this.x+this.w,this.y,this.w,this.h)
    }
}

class Bar {
    constructor(x,y,w,h,colour) {
	    this.x=x
	    this.y=y
	    this.w=w
	    this.h=h
	    this.c=colour
	    this.fill=w
    }

    draw() {
	    ctx.fillStyle=this.c
	    ctx.fillRect(this.x,this.y,this.fill,this.h)
	    ctx.strokeStyle = "#fff"
	    ctx.strokeRect(this.x,this.y,this.w,this.h)
    }
}

class Particle {
    constructor(texture,x,y,w,h,maxVX,maxVY,rot,duration,editVX,editVY) {
	    this.texture=texture
	    this.x=x
	    this.y=y
	    this.w=w
	    this.h=h
	    this.vX = maxVX===undefined?0:(rng(2*maxVX)-maxVX)+(editVX===undefined?0:editVX)
	    this.vY = maxVY===undefined?0:(rng(2*maxVY)-maxVY)+(editVY===undefined?0:editVY)
	    this.rot = 0
	    this.vRot = rot===undefined?0:rot
	    setTimeout(()=>{this.finished=true}, duration===undefined?3000:duration)
	    this.finished = false
    }

    update() {
	    this.x += this.vX
	    this.y += this.vY
	    if (this.rot + this.vRot > 360)
	        this.rot = (this.rot+this.vRot)-360
	    else if (this.rot + this.vRot < 0)
	        this.rot = (this.rot+this.vRot)+360
	    else
	        this.rot += this.vRot
    }

    draw() {
	    ctx.translate(this.x+this.w/2, this.y+this.h/2)
	    ctx.rotate(this.rot * TO_RAD)
	    drawImage(this.texture,-this.w/2,-this.h/2,this.w,this.h)
	    ctx.rotate(-(this.rot*TO_RAD))
	    ctx.translate(-(this.x+this.w/2), -(this.y+this.h/2))
    }
}

class Projectile extends Component {
    constructor(tex,x,y,w,h,vX,vY) {
	    super(tex,x,y,w,h)
	    this.vX=vX===undefined?3:vX
	    this.vY=vY===undefined?0:vY
	    this.offscreen = false
    }

    update() {
	    this.x+=this.vX
	    this.y+=this.vY

	    if (this.x+this.w<0 || this.y+this.w<0 || this.x>c.width || this.y>c.height) {
	        this.offscreen = true
	    }
    }
}

class Enemy {
    constructor(type, x, y, w, h) {
	    this.type=type
	    this.x=x
	    this.y=y
	    this.w=w
	    this.h=h
	    this.offscreen = false
	    this.boolets = []
    }

    update() {
	    if (this.ded !== true)
	        this.x-=ENEMY_TYPES[this.type].speed
	    if (this.x+this.w < 0) {
	        this.offscreen = true
	    }

	    if (rngInt(ENEMY_TYPES[this.type])===0) {
	        this.boolets.push(new Projectile("bullet",this.x+this.w/2,this.y+this.h/2))
	    }
    }

    draw() {
	    drawImage(ENEMY_TYPES[this.type].texture,this.x,this.y,this.w,this.h)
	    this.boolets.forEach(e=>{e.draw()})
    }
}

class Player {
    constructor(x, y, w, h) {
	    this.x=x
	    this.y=y
	    this.w=w
	    this.h=h

	    this.maxHealth = 3
	    this.health = this.maxHealth
	    this.invulnTimer = 0
        this.score = 0

	    this.lasers = []
	    this.canShoot = true

	    this.healthBar = new Bar(2,2,c.width-4,10,"red")
	    this.powerBar = new Bar(2,14,c.width-4,10,"blue")
    }

    invulnerable(seconds) {
	    this.invuln = true
	    this.invulnTimer = seconds*60 // to frames
    }

    draw() {
	    if (this.invulnTimer % 2 === 0)
	        drawImage("player", this.x, this.y, this.w, this.h)
	    this.lasers.forEach(e=>{
	        e.draw()
	    })
	    this.healthBar.draw()
	    this.powerBar.draw()

        ctx.textAlign = "left"
        ctx.font = "40px Arial"
        ctx.fillStyle = "white"
        ctx.fillText(this.score, 20,60)
        ctx.strokeStyle = "black"
        ctx.strokeText(this.score, 20,60)
    }

    update() {
	    this.vX = (mousepos.x - (this.x+this.w/2)) * 0.1
	    this.vY = (mousepos.y - (this.y+this.h/2)) * 0.1

	    if (this.timer < PLAYER_SHOOT_TIMER) {
	        this.timer++
	        this.powerBar.fill = this.powerBar.w/PLAYER_SHOOT_TIMER*this.timer
	    }
	    if (this.timer >= PLAYER_SHOOT_TIMER)
	        this.canShoot = true
	    if (input.isDown("s") && this.canShoot) {
	        this.lasers.push(new Projectile("laser",this.x,this.y+this.h/2,32,8,this.vX+3>=1?this.vX+3:1))
	        this.canShoot = false
	        this.timer = 0
	    }

	    this.x += this.vX
	    this.y += this.vY

	    for (let i=0; i<this.lasers.length; i++) {
	        this.lasers[i].update()

	        if (this.lasers[i].offscreen === true) {
		        this.lasers.splice(i,1)
		        i--
	        }
	    }

	    if (this.invuln === true) {
	        this.invulnTimer--
	        if (this.invulnTimer <= 0)
		        this.invuln = false
	    }
    }
}

class Game {
    constructor() {
	    this.player = new Player(20, c.height/2, THING_SIZE, THING_SIZE)
	    this.enemies = []
	    this.particles = []
	    this.bglayers = [new Paralax("bg0",0,0,c.width,c.height,0.5), new Paralax("bg1",0,0,c.width,c.height,0.75)]
        this.hiscore = this.getHiScore()

	    this.gamestate = "playing"
    }

    getHiScore() {
        let score = localStorage.getItem("hiscore")
        if (score)
            return score
        else
            return 0
    }

    setHiScore(newScore) {
        localStorage.setItem("hiscore", newScore)
    }


    draw() {
	    if (!input.isDown("q")) {
	        this.bglayers.forEach(e=>{e.draw()})
	    }

	    this.player.draw()
	    this.enemies.forEach(e=>{e.draw()})
	    this.particles.forEach(e=>{e.draw()})

        ctx.textAlign = "right"
        ctx.font = "Arial 20px"
        ctx.fillStyle = "white"
        ctx.fillText(`Hi-Score: ${this.hiscore}`, c.width-20, 60)
        ctx.strokeStyle = "black"
        ctx.strokeText(`Hi-Score: ${this.hiscore}`, c.width-20, 60)

	    if (this.gamestate === "gameover")
	        drawImage("gameover",c.width/2,c.height/2,256,128,true)
    }

    update() {
	    this.player.update()
	    this.particles.forEach(e=>{e.update()})
	    this.bglayers.forEach(e=>{e.update()})

	    if (this.player.health <= 0) {
	        this.gamestate = "gameover"
            if (this.player.score > this.hiscore)
                this.setHiScore(this.player.score)
        }

	    if (rngInt(ENEMY_SPAWN_CHANCE) === 0) {
	        this.enemies.push(new Enemy(
		        rngInt(ENEMY_TYPES.length),
		        c.width,
		        rngInt(c.height-THING_SIZE),
		        THING_SIZE,
		        THING_SIZE
	        ))
	    }

	    for (let i=0; i<this.enemies.length; i++) {
            // Player enemy collide
	        if (collideRectRect(this.enemies[i].x,this.enemies[i].y,this.enemies[i].w,this.enemies[i].h,
				                this.player.x,this.player.y,this.player.w,this.player.h)&& !this.player.invuln) {
		        this.player.health--
		        this.player.invulnerable(PLAYER_INVULN_TIMER)
		        this.player.healthBar.fill = (this.player.healthBar.w/this.player.maxHealth)*this.player.health
	        }

	        this.enemies[i].update()
	        if (this.enemies[i].offscreen===true) {
		        this.enemies.splice(i, 1)
		        if (i > 0)
		            i--
	        }

            // Laser update and collide
	        this.player.lasers.forEach((e,i2)=>{
		        if (rngInt(PARTICLE_LASER_CHANCE)===0)
		            this.particles.push(new Particle("laserpart",e.x+e.w/2,e.y+e.h/2,8,8,0.5,0.5,rng(5),500))
		        if (this.enemies.length > 0) {
		            if (collideRectRect(e.x,e.y,e.w,e.h,this.enemies[i].x,this.enemies[i].y,this.enemies[i].w,this.enemies[i].h)) {
			            //this.enemies[i].ded=true
			            let enemy = this.enemies[i]

			            this.particles.push(new Particle("explosion", enemy.x,enemy.y,enemy.w,enemy.h,0,0,rngInt(2),3000,-1))
			            let justincase = rng(3)+3
			            for (let i=0; i<justincase; i++) {
			                this.particles.push(new Particle("smoke", enemy.x,enemy.y,enemy.w/2,enemy.h/2,1,1,rngInt(5),3500,-1))
			            }

			            this.enemies.splice(i,1)
			            this.player.lasers.splice(i2,1)
			            if (i > 0)
			                i--

                        this.player.score++
		            }
		        }
	        })
	    }

	    this.particles.forEach((e,i) => {
	        if (e.finished === true) {
		        this.particles.splice(i,1)
		        if (i>0)
		            i--
	        }
	    })
    }
}




let game = new Game()

preload({
    "player":    "images/player.png",
    "badguy1":   "images/badguy1.png",
    "badguy2":   "images/badguy2.png",
    "badguy3":   "images/badguy3.png",
    "laser":     "images/laser.png",
    "bg0":       "images/background.png",
    "bg1":       "images/stars.png",
    "explosion": "images/boom.png",
    "smoke":     "images/smoke.png",
    "gameover":  "images/gameover.png",
    "laserpart": "images/whyisthisevenanimage.png",
    "bullet":    "images/bullet.png"
    //"badguysheet": "images/badguysheet.png"
})

function mainLoop() {
    input.update()

    if (game.gamestate === "playing")
	    game.update()

    game.draw()

    requestAnimationFrame(mainLoop)
}

requestAnimationFrame(mainLoop)
