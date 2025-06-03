async def process_video_task(file_path: str, detection_mode: DetectionMode, frame_skip: int):
    """Background task for video processing."""
    try:
        logger.info(f"Starting video processing: {file_path}")
        
        # Process video
        detections = await video_processor.process_video(
            file_path, yolo_service, detection_mode, frame_skip
        )
        
        # DEBUG: Log what we're about to send
        logger.info(f"🗺️ Fresh processing complete: {len(detections)} detections")
        for i, detection in enumerate(detections[:3]):  # Log first 3
            detection_dict = detection.to_dict()
            main_suggestion = detection_dict.get('modelSuggestions', [{}])[0].get('type', 'unknown')
            logger.info(f"  Detection {i+1}: {main_suggestion}")
            logger.info(f"    Full frame data: {len(detection_dict.get('fullFrameImageData', '')) > 0}")
            logger.info(f"    Crop data: {len(detection_dict.get('frameImageData', '')) > 0}")
            logger.info(f"    Suggestions: {len(detection_dict.get('modelSuggestions', []))}")
        
        # Broadcast completion
        detections_data = [d.to_dict() for d in detections]
        await manager.broadcast({
            "type": "processing_complete",
            "data": {
                "total_detections": len(detections),
                "detections": detections_data
            }
        })
        
        logger.info(f"Video processing complete: {len(detections)} unique detections broadcasted")
        
    except Exception as e:
        logger.error(f"Video processing failed: {str(e)}")
        await manager.broadcast({
            "type": "processing_error",
            "data": {"error": str(e)}
        })
