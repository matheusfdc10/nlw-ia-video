import { FileVideo, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import { getFFmpeg } from "@/lib/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { api } from "@/lib/axios";

type Status = 'waiting' | 'converting' | 'uploading' | 'generating' | 'success';

const statusMessages = {
    converting: "Convertendo...",
    generating: "Transcrevendo...",
    uploading: "Carregando...",
    success: "Sucesso!"
}

interface VideoInputFormProps {
    onVideoUpload: (id: string) => void;
}

export const VideoInputForm: React.FC<VideoInputFormProps> = ({
    onVideoUpload
}) => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [status, setStatus] = useState<Status>('waiting');

    const promptInputRef = useRef<HTMLTextAreaElement>(null);
    
    const handleFileSelected = (event: ChangeEvent<HTMLInputElement>) => {
        const { files } = event.currentTarget;

        if (!files) return;

        const selectFile = files[0];

        setStatus('waiting')
        setVideoFile(selectFile)
    }

    const converterVideoToAudio = async (video: File) => {
        const ffmpeg = await getFFmpeg();
        await ffmpeg.writeFile('input.mp4', await fetchFile(video));

        /* 
        ffmpeg.on('log', (log) => {
            console.log(log)
        })
        */

        ffmpeg.on('progress', (progress) => {
            console.log('Convert progress: ' + Math.round(progress.progress * 100))
        })

        await ffmpeg.exec([
            '-i',
            'input.mp4',
            '-map',
            '0:a',
            '-b:a',
            '20k',
            '-acodec',
            'libmp3lame',
            'output.mp3',
        ])

        const data = await ffmpeg.readFile("output.mp3");

        const audioFileBlob = new Blob([data], { type: 'audio/mpeg'});
        const audioFile = new File([audioFileBlob], 'audio.mp3', {
            type: 'audio/mpeg'
        });

        return audioFile;
    }

    const handleUploadVideo = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        
        const prompt = promptInputRef.current?.value;
        

        if (!videoFile) return;

        setStatus('converting')

        // converter o vídeo em áudio
        const audioFile = await converterVideoToAudio(videoFile);
        
        
        const data = new FormData()

        data.append('file', audioFile);

        setStatus('uploading')

        const response = await api.post('/videos', data);

        const videoId = response.data.video.id;

        setStatus('generating')

        await api.post(`/videos/${videoId}/transcription`, {
            prompt,
        });

        setStatus('success');

        onVideoUpload(videoId);
    }

    const previwURL = useMemo(() => {
        if (!videoFile) return null;

        return URL.createObjectURL(videoFile)
    }, [videoFile])

    return ( 
        <form onSubmit={handleUploadVideo} className="space-y-6">
            <label 
              htmlFor="video"
              className="relative border flex rounded-md aspect-video cursor-pointer border-dashed text-sm flex-col gap-2 justify-center items-center text-muted-foreground hover:bg-primary/5"
            >
              {previwURL ? (
                <video src={previwURL} controls={false} className="pointer-events-none absolute inset-0" />
              ) : (
                <>
                    <FileVideo className="w-4 h-4"/>
                    Selecione um vídeo
                </>                
              )}
            </label>
            <input type="file" id="video" accept="video/mp4" className="sr-only" onChange={handleFileSelected} />
            <Separator />
            
            <div className="space-y-2">
              <Label id="transcription-prompt">Prompt de transcrição</Label>
              <Textarea
                disabled={status !== 'waiting'}
                ref={promptInputRef}
                id="transcription-prompt" 
                className="h-20 leading-relaxed resize-none"
                placeholder="Inclua palavras-chave mencionadas no vídeo separada por vírgula (,)"
              />
            </div>
            <Button
                data-success={status === 'success'}
                disabled={status !== 'waiting'}
                type="submit" 
                className="w-full data-[success=true]:bg-emerald-400"
            >
                {status === 'waiting' ? (
                    <>
                        Carregar video
                        <Upload className="h-4 w-4 ml-2"/>
                    </>
                ) : statusMessages[status]}
            </Button>
          </form>
     );
}
 