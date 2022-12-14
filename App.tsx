import { cameraWithTensors } from '@tensorflow/tfjs-react-native';
import { Camera } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { Dimensions, LogBox, Platform, StyleSheet, Text, View } from 'react-native';
import * as cocoSsd from '@tensorflow-models/coco-ssd'
import * as tf from '@tensorflow/tfjs'
import { useEffect, useRef, useState } from 'react';
import Canvas from 'react-native-canvas';

const TensorCamera = cameraWithTensors(Camera)

const { width, height } = Dimensions.get('window')

LogBox.ignoreAllLogs(true)

export default function App() {
  const [model, setModel] = useState<cocoSsd.ObjectDetection>()
  let context = useRef<CanvasRenderingContext2D>()
  let canvas = useRef<Canvas>()
  let textureDims = Platform.OS == 'ios' ? { height: 1920, width: 1080 } : { height: 1200, width: 1600 }

  function handleCameraStream(images: any) {
    const loop = async () => {
      const nextImageTensor = images.next().value
      if (!nextImageTensor) throw new Error('No Image tensor')
      if (!model) throw new Error('No model')
      model.detect(nextImageTensor).then((prediction) => {
        console.log(prediction)
        drawRectangle(prediction, nextImageTensor)
      }).catch((error) => {
        console.log('não achou')
        console.log(error)
      })
      requestAnimationFrame(loop)
    }
    loop()
  }

  function drawRectangle(predictions: cocoSsd.DetectedObject[], nextImageTensor: any) {

    console.log('entrou')
    if (!context.current || !canvas.current) return
    console.log('ola')

    const scaleWidth = width / nextImageTensor.shape[1]
    const scaleHeight = height / nextImageTensor.shape[0]

    const flipHorizontal = Platform.OS == 'ios' ? false : true

    context.current.clearRect(0, 0, width, height)

    for (const prediction of predictions) {
      const [x, y, width, height] = prediction.bbox

      const boundingBoxX = flipHorizontal ? canvas.current.width - x * scaleWidth - width * scaleHeight : x * scaleWidth

      const boundingBoxY = y * scaleHeight

      context.current.strokeRect(boundingBoxX, boundingBoxY, width * scaleWidth, height * scaleHeight)

      context.current.strokeText(prediction.class, boundingBoxX - 5, boundingBoxY - 5)

    }
  }

  async function handleCanvas(can: Canvas) {
    if (can) {
      can.width = width
      can.height = height
      const ctx: CanvasRenderingContext2D = can.getContext('2d')
      ctx.strokeStyle = 'red'
      ctx.fillStyle = 'red'
      ctx.lineWidth = 3

      context.current = ctx
      canvas.current = can
    }
  }

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      await tf.ready()
      setModel(await cocoSsd.load())
    })()
  }, [])

  return (
    <View style={styles.container}>
      <TensorCamera
        style={styles.camera}
        type={Camera.Constants.Type.back}
        cameraTextureHeight={textureDims.height}
        cameraTextureWidth={textureDims.width}
        resizeHeight={200}
        resizeWidth={152}
        resizeDepth={3}
        onReady={handleCameraStream}
        autorender={true}
        useCustomShadersToResize={false}
      />
      <Canvas style={styles.canvas} ref={handleCanvas} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    width: '100%',
    height: '100%'
  },
  canvas: {
    position: 'absolute',
    zIndex: 100000000,
    width: '100%',
    height: '100%'
  },
});
