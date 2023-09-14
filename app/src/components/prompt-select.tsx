import { useEffect, useState} from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/axios";

interface Prompt {
    id: string;
    title: string;
    template: string;
}

interface PromptSelectProps {
    onPromptSelected: (template: string) => void;
}

export const PromptSelect: React.FC<PromptSelectProps> = ({
    onPromptSelected
}) => {
    const [prompts, setPrompts] = useState<Prompt[] | null>(null);

    useEffect(() => {
        api.get('/prompts').then((response) => {
            setPrompts(response.data)
        })
    }, []);

    const handlePromptSelected = (promptId: string) => {
        const selectPrompt = prompts?.find(prompt => prompt.id === promptId);

        if (!selectPrompt) return;

        onPromptSelected(selectPrompt.template)
    }
    
    return ( 
        <Select onValueChange={handlePromptSelected}>
            <SelectTrigger>
                <SelectValue placeholder="Selecione um prompt..."/>
            </SelectTrigger>
            <SelectContent>
                {prompts?.map((prompt) => (
                    <SelectItem key={prompt.id} value={prompt.id}>
                        {prompt.title}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
     );
}