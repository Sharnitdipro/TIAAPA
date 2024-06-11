const chatInput = document.querySelector("#chat-input");
const sendButton = document.querySelector("#send-btn");
const chatContainer = document.querySelector(".chat-container");
const themeButton = document.querySelector("#theme-btn");
const deleteButton = document.querySelector("#delete-btn");

const loadDataFromLocalStorage = () => {
    const themeColor = localStorage.getItem("themeColor") || "light_mode";

    document.body.classList.toggle("light-mode", themeColor === "light_mode");
    themeButton.innerText = themeColor === "light_mode" ? "dark_mode" : "light_mode";

    const savedChats = localStorage.getItem("all-chats");

    if (savedChats) {
        chatContainer.innerHTML = savedChats;
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    } else {
        showDefaultText();
    }
};

const showDefaultText = () => {
    const defaultText = `<div class="default-text">
                            <h1>TIA APA</h1>
                            <p>Ask anything to APA.<br> Your chat will be displayed here.</p>
                        </div>`;
    chatContainer.innerHTML = defaultText;
};

const createChatElement = (content, className) => {
    const chatDiv = document.createElement("div");
    chatDiv.classList.add("chat", className);
    chatDiv.innerHTML = content;
    return chatDiv;
};

const sendMessage = async () => {
    const userText = chatInput.value.trim();
    if (!userText) return;

    const userChat = createChatElement(`<div class="chat-content">
                                            <div class="chat-details">
                                                <img src="/static/images/user.jpg" alt="user-img">
                                                <p>${userText}</p>
                                            </div>
                                        </div>`, "outgoing");
    chatContainer.appendChild(userChat);
    chatContainer.scrollTo(0, chatContainer.scrollHeight);

    chatInput.value = "";

    try {
        const response = await fetch("/get_response", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ user_input: userText })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Response from server:", data);

        const botResponse = data.response;

        const botChat = createChatElement(`<div class="chat-content">
                                                <div class="chat-details">
                                                    <img src="/static/images/chatbot.jpg" alt="chatbot-img">
                                                    <p>${botResponse}</p>
                                                </div>
                                            </div>`, "incoming");
        chatContainer.appendChild(botChat);
        chatContainer.scrollTo(0, chatContainer.scrollHeight);

        localStorage.setItem("all-chats", chatContainer.innerHTML);
    } catch (error) {
        console.error("Error while sending message:", error);
        const errorChat = createChatElement(`<div class="chat-content">
                                                 <div class="chat-details">
                                                     <img src="/static/images/chatbot.jpg" alt="chatbot-img">
                                                     <p class="error">Error: Unable to fetch response.</p>
                                                 </div>
                                             </div>`, "incoming");
        chatContainer.appendChild(errorChat);
        chatContainer.scrollTo(0, chatContainer.scrollHeight);
    }
};

const deleteChats = () => {
    if (confirm("Are you sure you want to delete all the chats?")) {
        localStorage.removeItem("all-chats");
        showDefaultText();
    }
};

const toggleTheme = () => {
    const themeColor = document.body.classList.contains("light-mode") ? "dark_mode" : "light_mode";
    document.body.classList.toggle("light-mode");
    themeButton.innerText = themeColor;
    localStorage.setItem("themeColor", themeColor);
};

const handleSendClick = () => {
    sendMessage();
};

const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
        e.preventDefault();
        sendMessage();
    }
};

loadDataFromLocalStorage();
sendButton.addEventListener("click", handleSendClick);
deleteButton.addEventListener("click", deleteChats);
themeButton.addEventListener("click", toggleTheme);
chatInput.addEventListener("keydown", handleKeyDown);
