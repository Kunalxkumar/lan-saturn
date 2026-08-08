import sys
import os
import subprocess
import threading
import time
import socket
import webbrowser
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext

class ServerManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("LAN Saturn - Server Manager")
        self.root.geometry("780x580")
        self.root.minsize(700, 500)
        self.root.configure(bg="#0b0f19")

        self.server_process = None
        self.is_running = False

        self._init_styles()
        self._create_widgets()
        self.refresh_network_info()

    def _init_styles(self):
        self.style = ttk.Style()
        self.style.theme_use('default')
        
        # Colors
        self.bg_dark = "#0b0f19"
        self.bg_card = "#111827"
        self.bg_hover = "#1e293b"
        self.accent_purple = "#6366f1"
        self.accent_green = "#10b981"
        self.accent_red = "#ef4444"
        self.text_light = "#f8fafc"
        self.text_dim = "#94a3b8"

        self.style.configure("TFrame", background=self.bg_dark)
        self.style.configure("Card.TFrame", background=self.bg_card, relief="flat")
        self.style.configure("TLabel", background=self.bg_card, foreground=self.text_light, font=("Segoe UI", 10))
        self.style.configure("Header.TLabel", background=self.bg_card, foreground=self.text_light, font=("Segoe UI", 14, "bold"))
        self.style.configure("Title.TLabel", background=self.bg_dark, foreground=self.text_light, font=("Segoe UI", 18, "bold"))
        
        self.style.configure("StatusStop.TLabel", background=self.bg_card, foreground=self.accent_red, font=("Segoe UI", 11, "bold"))
        self.style.configure("StatusRun.TLabel", background=self.bg_card, foreground=self.accent_green, font=("Segoe UI", 11, "bold"))

    def _create_widgets(self):
        # Header Bar
        header_frame = ttk.Frame(self.root, style="TFrame")
        header_frame.pack(fill="x", padx=20, pady=15)

        title_label = ttk.Label(header_frame, text=" LAN Saturn Server Manager", style="Title.TLabel")
        title_label.pack(side="left")

        # Top Grid (Status & Controls)
        content_frame = ttk.Frame(self.root, style="TFrame")
        content_frame.pack(fill="both", expand=True, padx=20, pady=5)

        # Status & Control Card
        status_card = ttk.Frame(content_frame, style="Card.TFrame", padding=15)
        status_card.pack(fill="x", pady=5)

        card_title = ttk.Label(status_card, text="Server Control Dashboard", style="Header.TLabel")
        card_title.grid(row=0, column=0, columnspan=3, sticky="w", pady=(0, 10))

        ttk.Label(status_card, text="Status:").grid(row=1, column=0, sticky="w", pady=4)
        self.status_lbl = ttk.Label(status_card, text="🔴 Stopped", style="StatusStop.TLabel")
        self.status_lbl.grid(row=1, column=1, sticky="w", pady=4, padx=10)

        # Buttons Frame
        btn_frame = ttk.Frame(status_card, style="Card.TFrame")
        btn_frame.grid(row=2, column=0, columnspan=3, sticky="w", pady=10)

        self.btn_start = tk.Button(
            btn_frame, text="▶ Start Server", bg=self.accent_green, fg="#ffffff",
            font=("Segoe UI", 10, "bold"), relief="flat", padx=15, pady=6, cursor="hand2",
            command=self.start_server
        )
        self.btn_start.pack(side="left", padx=(0, 10))

        self.btn_stop = tk.Button(
            btn_frame, text="⏹ Stop Server", bg=self.accent_red, fg="#ffffff",
            font=("Segoe UI", 10, "bold"), relief="flat", padx=15, pady=6, cursor="hand2",
            state="disabled", command=self.stop_server
        )
        self.btn_stop.pack(side="left", padx=(0, 10))

        self.btn_restart = tk.Button(
            btn_frame, text="🔄 Restart Server", bg=self.accent_purple, fg="#ffffff",
            font=("Segoe UI", 10, "bold"), relief="flat", padx=15, pady=6, cursor="hand2",
            state="disabled", command=self.restart_server
        )
        self.btn_restart.pack(side="left")

        # Network Info Card
        net_card = ttk.Frame(content_frame, style="Card.TFrame", padding=15)
        net_card.pack(fill="x", pady=10)

        net_title = ttk.Label(net_card, text="Network Access URLs", style="Header.TLabel")
        net_title.pack(anchor="w", pady=(0, 5))

        self.url_container = ttk.Frame(net_card, style="Card.TFrame")
        self.url_container.pack(fill="x", pady=5)

        # Actions Bar
        actions_frame = ttk.Frame(net_card, style="Card.TFrame")
        actions_frame.pack(fill="x", pady=5)

        btn_open_web = tk.Button(
            actions_frame, text="🌐 Open Web Interface", bg="#334155", fg="#ffffff",
            font=("Segoe UI", 9, "bold"), relief="flat", padx=12, pady=4, cursor="hand2",
            command=self.open_in_browser
        )
        btn_open_web.pack(side="left", padx=(0, 10))

        btn_copy_url = tk.Button(
            actions_frame, text="📋 Copy Local LAN URL", bg="#334155", fg="#ffffff",
            font=("Segoe UI", 9, "bold"), relief="flat", padx=12, pady=4, cursor="hand2",
            command=self.copy_lan_url
        )
        btn_copy_url.pack(side="left")

        # Console / Logs Section
        log_frame = ttk.Frame(content_frame, style="TFrame")
        log_frame.pack(fill="both", expand=True, pady=10)

        log_header = ttk.Frame(log_frame, style="TFrame")
        log_header.pack(fill="x", pady=(0, 5))

        log_lbl = tk.Label(log_header, text="Server Output Logs", bg=self.bg_dark, fg=self.text_light, font=("Segoe UI", 11, "bold"))
        log_lbl.pack(side="left")

        btn_clear_log = tk.Button(
            log_header, text="Clear Logs", bg="#1e293b", fg=self.text_dim,
            font=("Segoe UI", 8), relief="flat", padx=8, pady=2, cursor="hand2",
            command=self.clear_logs
        )
        btn_clear_log.pack(side="right")

        self.log_text = scrolledtext.ScrolledText(
            log_frame, bg="#050811", fg="#38bdf8", insertbackground="#ffffff",
            font=("Consolas", 9), relief="flat"
        )
        self.log_text.pack(fill="both", expand=True)
        self.log_text.insert(tk.END, "🪐 LAN Saturn Server Manager initialized.\nClick 'Start Server' to run the backend.\n\n")

    def refresh_network_info(self):
        for widget in self.url_container.winfo_children():
            widget.destroy()

        urls = ["http://127.0.0.1:5000"]
        try:
            hostname = socket.gethostname()
            for ip in socket.gethostbyname_ex(hostname)[2]:
                if not ip.startswith("127."):
                    urls.append(f"http://{ip}:5000")
        except Exception:
            pass

        self.lan_urls = urls
        for idx, url in enumerate(urls):
            lbl = tk.Label(
                self.url_container, text=f"• {url}", bg=self.bg_card, fg="#818cf8",
                font=("Consolas", 10, "bold"), anchor="w"
            )
            lbl.pack(fill="x", py=2)

    def append_log(self, text):
        self.log_text.insert(tk.END, text)
        self.log_text.see(tk.END)

    def clear_logs(self):
        self.log_text.delete('1.0', tk.END)

    def start_server(self):
        if self.is_running:
            return

        cmd = [sys.executable, "run.py"]
        if os.path.exists("dist/lan-saturn-server.exe"):
            cmd = ["dist/lan-saturn-server.exe"]

        try:
            self.server_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0
            )
            self.is_running = True
            self.status_lbl.configure(text="🟢 Running on Port 5000", style="StatusRun.TLabel")
            self.btn_start.configure(state="disabled", bg="#334155")
            self.btn_stop.configure(state="normal", bg=self.accent_red)
            self.btn_restart.configure(state="normal", bg=self.accent_purple)
            
            self.append_log(">>> Launching server process...\n")

            # Output listener thread
            threading.Thread(target=self._stream_logs, daemon=True).start()
        except Exception as err:
            messagebox.showerror("Error", f"Failed to launch server process:\n{err}")

    def _stream_logs(self):
        if not self.server_process:
            return

        for line in iter(self.server_process.stdout.readline, ''):
            if not line:
                break
            self.root.after(0, self.append_log, line)

        self.server_process.stdout.close()
        self.server_process.wait()

        self.root.after(0, self._on_process_exit)

    def _on_process_exit(self):
        self.is_running = False
        self.status_lbl.configure(text="🔴 Stopped", style="StatusStop.TLabel")
        self.btn_start.configure(state="normal", bg=self.accent_green)
        self.btn_stop.configure(state="disabled", bg="#334155")
        self.btn_restart.configure(state="disabled", bg="#334155")
        self.append_log("\n>>> Server process terminated.\n")

    def stop_server(self):
        if self.server_process and self.is_running:
            self.append_log(">>> Stopping server...\n")
            self.server_process.terminate()

    def restart_server(self):
        if self.is_running:
            self.stop_server()
            self.root.after(1000, self.start_server)

    def open_in_browser(self):
        webbrowser.open("http://127.0.0.1:5000")

    def copy_lan_url(self):
        if self.lan_urls:
            target_url = self.lan_urls[-1]
            self.root.clipboard_clear()
            self.root.clipboard_append(target_url)
            messagebox.showinfo("Copied", f"Copied LAN URL to clipboard:\n{target_url}")

if __name__ == '__main__':
    root = tk.Tk()
    app = ServerManagerApp(root)
    root.mainloop()
