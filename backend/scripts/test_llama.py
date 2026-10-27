"""
Test script for running meta-llama/Llama-3.2-3B-Instruct with transformers pipeline.
Uses natural, conversational client advisory prompt for Lyka Realty.
"""
import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import torch
from transformers import pipeline
from app.config import settings

def main():
    model_id = "meta-llama/Llama-3.2-3B-Instruct"
    token = settings.HUGGINGFACE_API_KEY or settings.HF_TOKEN
    
    print(f"=== Testing {model_id} ===")
    print(f"Torch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")
    print(f"Hugging Face Token detected: {bool(token)}")
    
    if torch.cuda.is_available() and torch.cuda.is_bf16_supported():
        torch_dtype = torch.bfloat16
        pipe_kwargs = {"device_map": "auto"}
    elif torch.cuda.is_available():
        torch_dtype = torch.float16
        pipe_kwargs = {"device_map": "auto"}
    else:
        torch_dtype = torch.float32
        pipe_kwargs = {"device": "cpu"}

    print("\nLoading pipeline (this will download model weights on first run)...")
    try:
        pipe = pipeline(
            "text-generation",
            model=model_id,
            torch_dtype=torch_dtype,
            token=token,
            **pipe_kwargs
        )
    except Exception as e:
        err = str(e)
        print(f"\n[Error loading pipeline]: {err}")
        if "gated repo" in err.lower() or "403" in err:
            print("\n*** ACTION REQUIRED ***")
            print("To use meta-llama/Llama-3.2-3B-Instruct, Meta requires a one-time license acceptance on Hugging Face:")
            print("1. Go to: https://huggingface.co/meta-llama/Llama-3.2-3B-Instruct")
            print("2. Log in with your account (Bernish87)")
            print("3. Click 'Acknowledge license / Accept' (Approval is free and instantaneous).")
            print("4. Re-run this script!")
        return

    # Normal conversational prompt for Lyka AI property advisory
    messages = [
        {
            "role": "system",
            "content": (
                "You are Lyka AI, the premier luxury real estate advisory assistant for Lyka Realty in Dubai. "
                "Speak in a natural, warm, and professional conversational tone as in everyday conversation."
            )
        },
        {
            "role": "user",
            "content": "Hi, I'm looking for a 2 bedroom apartment in Dubai Marina with a nice view. What options can you suggest?"
        },
    ]

    print("\nGenerating reply...")
    outputs = pipe(
        messages,
        max_new_tokens=256,
        temperature=0.7,
        do_sample=True,
    )

    last_reply = outputs[0]["generated_text"][-1]
    reply_content = last_reply.get("content", str(last_reply)) if isinstance(last_reply, dict) else str(last_reply)
    
    print("\n=== Generated Advisory Reply ===")
    print(reply_content)

if __name__ == "__main__":
    main()
