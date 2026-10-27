import torch
from transformers import pipeline
from typing import Optional, List, Dict, Any
from backend.app.config import settings

_llama_pipe = None
_pipe_loading = False
_pipe_failed = False

def reset_llama_pipeline():
    global _llama_pipe, _pipe_failed, _pipe_loading
    _llama_pipe = None
    _pipe_failed = False
    _pipe_loading = False

def get_llama_pipeline():
    """
    Lazily loads and caches the meta-llama/Llama-3.2-3B-Instruct pipeline in memory.
    """
    global _llama_pipe, _pipe_loading, _pipe_failed
    if _llama_pipe is not None:
        return _llama_pipe
    if _pipe_loading or _pipe_failed:
        return None

    model_id = getattr(settings, "LOCAL_LLAMA_MODEL", "meta-llama/Llama-3.2-3B-Instruct")
    token = settings.HUGGINGFACE_API_KEY or settings.HF_TOKEN

    try:
        _pipe_loading = True
        # bfloat16 on CUDA if supported, otherwise float32 on CPU for stability
        if torch.cuda.is_available() and torch.cuda.is_bf16_supported():
            torch_dtype = torch.bfloat16
            pipe_kwargs = {"device_map": "auto"}
        elif torch.cuda.is_available():
            torch_dtype = torch.float16
            pipe_kwargs = {"device_map": "auto"}
        else:
            torch_dtype = torch.float32
            pipe_kwargs = {"device": "cpu"}

        print(f"[LLaMA 3.2] Initializing text-generation pipeline for {model_id}...")
        _llama_pipe = pipeline(
            "text-generation",
            model=model_id,
            torch_dtype=torch_dtype,
            token=token,
            **pipe_kwargs
        )
        print(f"[LLaMA 3.2] Pipeline successfully initialized!")
        _pipe_failed = False
        return _llama_pipe
    except Exception as e:
        _pipe_failed = True
        print(f"[LLaMA 3.2 Notice] Pipeline initialization skipped: {e}")
        return None
    finally:
        _pipe_loading = False

def generate_local_llama_reply(
    system_prompt: str,
    user_content: str,
    conversation_history: Optional[List[Dict[str, str]]] = None,
    max_new_tokens: int = 256
) -> Optional[str]:
    """
    Generates a natural, professional advisory reply using Llama-3.2-3B-Instruct.
    Uses normal conversation (not pirate speak) suitable for client advisory.
    """
    pipe = get_llama_pipeline()
    if not pipe:
        return None

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": system_prompt}
    ]

    if conversation_history:
        for msg in conversation_history:
            messages.append(msg)

    messages.append({"role": "user", "content": user_content})

    try:
        outputs = pipe(
            messages,
            max_new_tokens=max_new_tokens,
            temperature=0.7,
            do_sample=True,
        )
        # Extract the last assistant reply turn
        last_turn = outputs[0]["generated_text"][-1]
        if isinstance(last_turn, dict):
            return last_turn.get("content", "").strip()
        return str(last_turn).strip()
    except Exception as e:
        print(f"[LLaMA 3.2 Generation Notice] {e}")
        return None
