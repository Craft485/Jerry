import * as THREE from 'https://cdn.skypack.dev/three@0.136'
import {OrbitControls} from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js'

const DEFAULTMASS = 10

class RigidBody {
    constructor() {}

    setRestitution(val) {
        this.body.setRestitution(val)
    }

    setFriction(val) {
        this.body.setFriction(val)
    }
    
    setRollingFriction(val) {
        this.body.setRollingFriction(val)
    }

    createBox(mass, pos, quat, size) {
        this.transform = new Ammo.btTransform()
        this.transform.setIdentity()
        this.transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z))
        this.transform.setRotation(new Ammo.btQuaternion(quat.x, quat.y, quat.z, quat.w))
        this.motionState = new Ammo.btDefaultMotionState(this.transform)

        const btSize = new Ammo.btVector3(size.x * 0.5, size.y * 0.5, size.z * 0.5)
        this.shape = new Ammo.btBoxShape(btSize)
        this.shape.setMargin(0.05)

        this.inertia = new Ammo.btVector3(0, 0, 0)
        if (mass > 0) {
          this.shape.calculateLocalInertia(mass, this.inertia)
        }
    
        this.info = new Ammo.btRigidBodyConstructionInfo(
            mass, this.motionState, this.shape, this.inertia)
        this.body = new Ammo.btRigidBody(this.info)
    
        Ammo.destroy(btSize)
    }

    createSphere(mass, pos, size) {
        this.transform = new Ammo.btTransform()
        this.transform.setIdentity()
        this.transform.setOrigin(new Ammo.btVector3(pos.x, pos.y, pos.z))
        this.transform.setRotation(new Ammo.btQuaternion(0, 0, 0, 1))
        this.motionState = new Ammo.btDefaultMotionState(this.transform)
    
        this.shape = new Ammo.btSphereShape(size)
        this.shape.setMargin(0.05)
    
        this.inertia = new Ammo.btVector3(0, 0, 0)
        if(mass > 0) {
          this.shape.calculateLocalInertia(mass, this.inertia)
        }
    
        this.info = new Ammo.btRigidBodyConstructionInfo(mass, this.motionState, this.shape, this.inertia)
        this.body = new Ammo.btRigidBody(this.info)
    }
}

class World {
    constructor() {}

    init() {
        // Setup Ammo physics
        this.collisionConfiguration = new Ammo.btDefaultCollisionConfiguration()
        this.dispatcher = new Ammo.btCollisionDispatcher(this.collisionConfiguration)
        this.broadphase = new Ammo.btDbvtBroadphase()
        this.solver = new Ammo.btSequentialImpulseConstraintSolver()
        this.physicsWorld = new Ammo.btDiscreteDynamicsWorld(this.dispatcher, this.broadphase, this.solver, this.collisionConfiguration)
        this.physicsWorld.setGravity(new Ammo.btVector3(0, -100, 0))

        this.renderer = new THREE.WebGLRenderer({ antialias: true })
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.setSize(window.innerWidth, window.innerHeight)

        document.body.appendChild(this.renderer.domElement)

        window.addEventListener('resize', () => { this.onWindowResize() })

        const fov = 60
        const aspect = 1920 / 1080
        const near = 1
        const far = 1000
        this.camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
        this.camera.position.set(75, 20, 0)
    
        this.scene = new THREE.Scene()
    
        let light = new THREE.DirectionalLight(0xFFFFFF, 1.0)
        light.position.set(20, 100, 10)
        light.target.position.set(0, 0, 0)
        light.castShadow = true
        light.shadow.bias = -0.001
        light.shadow.mapSize.width = 2048
        light.shadow.mapSize.height = 2048
        light.shadow.camera.near = 0.1
        light.shadow.camera.far = 500.0
        light.shadow.camera.near = 0.5
        light.shadow.camera.far = 500.0
        light.shadow.camera.left = 100
        light.shadow.camera.right = -100
        light.shadow.camera.top = 100
        light.shadow.camera.bottom = -100
        this.scene.add(light)

        const controls = new OrbitControls(this.camera, this.renderer.domElement)
        controls.target.set(0, 20, 0)
        controls.update()

        this.scene.background = new THREE.Color('skyblue')

        // Threejs render of ground
        const ground = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), new THREE.MeshStandardMaterial({ color: 0x404040 }))
        ground.castShadow = false
        ground.receiveShadow = true
        this.scene.add(ground)

        // Add ground representation into Ammo
        const rbGround = new RigidBody()
        rbGround.createBox(0, ground.position, ground.quaternion, new THREE.Vector3(100, 1, 100))
        rbGround.setRestitution(0.99)
        this.physicsWorld.addRigidBody(rbGround.body)

        this.rigidBodies = []

        const box = new THREE.Mesh(
          new THREE.BoxGeometry(4, 4, 4),
          new THREE.MeshStandardMaterial({color: 0x808080}))
        box.position.set(0, 40, 0)
        box.castShadow = true
        box.receiveShadow = true
        this.scene.add(box)

        const rbBox = new RigidBody()
        rbBox.createBox(1, box.position, box.quaternion, new THREE.Vector3(4, 4, 4))
        rbBox.setRestitution(0.25)
        rbBox.setFriction(1)
        rbBox.setRollingFriction(5)
        this.physicsWorld.addRigidBody(rbBox.body)
        
        this.rigidBodies.push({mesh: box, rigidBody: rbBox})

        this.tmpTransform = new Ammo.btTransform()

        this.countdown = 1
        this.count = 0
        this.previousRAF = null
        this.raf()
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
    }

    raf() {
        requestAnimationFrame(t => {
            if (this.previousRAF === null) this.previousRAF = t

            this.step(t - this.previousRAF)
            this.renderer.render(this.scene, this.camera)
            this.raf()
            this.previousRAF = t
        })
    }

    step(timeElapsed) {
        const timeElapsedS = timeElapsed * 0.001

        this.countdown -= timeElapsedS
        if (this.countdown < 0 && this.count < 10) {
            this.countdown = 0.25
            this.count += 1
        }

        // Update rb
        this.physicsWorld.stepSimulation(timeElapsedS, 10)

        for (let i = 0; i < this.rigidBodies.length; i++) {
            this.rigidBodies[i].rigidBody.motionState.getWorldTransform(this.tmpTransform)
            const pos = this.tmpTransform.getOrigin()
            const quat = this.tmpTransform.getRotation()
            const pos3 = new THREE.Vector3(pos.x(), pos.y(), pos.z())
            const quat3 = new THREE.Quaternion(quat.x(), quat.y(), quat.z(), quat.w())

            this.rigidBodies[i].mesh.position.copy(pos3)
            this.rigidBodies[i].mesh.quaternion.copy(quat3)
        }
    }
}

let APP = null

window.addEventListener('DOMContentLoaded', async () => {
    Ammo().then(lib => {
        Ammo = lib
        APP = new World()
        APP.init()
        // Expose app to dev tools
        window.APP = APP
    })
})