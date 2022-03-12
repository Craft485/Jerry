import * as THREE from 'https://cdn.skypack.dev/three@0.136'
import {OrbitControls} from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js'

class World {
    constructor() {}

    init() {
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

        const ground = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), new THREE.MeshStandardMaterial({ color: 0x404040 }))
        ground.castShadow = false
        ground.receiveShadow = true
        this.scene.add(ground)

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
            // this.spawn()
        }

        // Update rb
    }
}

let APP = null

window.addEventListener('DOMContentLoaded', async () => {
    APP = new World()
    APP.init()
})