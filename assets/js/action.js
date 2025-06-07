
document.addEventListener('DOMContentLoaded', () => {
    // Check whether the page has the container.
    const contentContainer = document.querySelector('.container-md.markdown-body');
    const h1Element = contentContainer.querySelector('h1');

    // 1. Create a wrapper for the dialogue content (will be populated by updateDisplayState)
    const dialogueWrapper = document.createElement('div');
    dialogueWrapper.id = 'dialogue-content-wrapper';
    dialogueWrapper.style.paddingBottom = '20px';  // for scroll up

    // 2. Create the textarea for editing
    const textarea = document.createElement('textarea');
    textarea.className = 'form-control';
    textarea.style.width = '100%';
    textarea.style.minHeight = '830px';
    textarea.style.display = 'none'; // Initially hidden
    textarea.style.setProperty('border', '1px solid lightgrey', 'important');
    textarea.style.padding = '10px';

    // 3. Create container and button for file picking
    const filePickerContainer = document.createElement('div');
    filePickerContainer.id = 'file-picker-container';
    filePickerContainer.style.width = '100%';
    filePickerContainer.style.minHeight = '830px'; // Match textarea height
    filePickerContainer.style.display = 'flex'; // Changed from 'none' to 'flex' for centering
    filePickerContainer.style.justifyContent = 'center';
    filePickerContainer.style.alignItems = 'center';
    filePickerContainer.style.padding = '20px';
    filePickerContainer.style.display = 'none'; // Initially hidden, updateDisplayState will show it

    const chooseFileButton = document.createElement('button');
    chooseFileButton.id = 'chooseFileButton';
    chooseFileButton.className = 'btn btn-primary'; // GitHub Primer style
    chooseFileButton.textContent = 'Choose File to Load Multilogue';
    chooseFileButton.style.padding = '10px 20px'; // Make button larger
    chooseFileButton.style.fontSize = '1.0rem';
    filePickerContainer.appendChild(chooseFileButton);

    // 4. Insert dynamic elements into the DOM (after H1 or fallback)
    if (h1Element) {
        h1Element.after(dialogueWrapper, textarea, filePickerContainer);
    } else {
        contentContainer.prepend(dialogueWrapper, textarea, filePickerContainer); // Fallback
    }

    // 5. Initialize localStorage:
    let platoTextForInit = localStorage.getItem('multilogue');
    if (platoTextForInit === null) {
        platoTextForInit = ''; // Initial state.
        localStorage.setItem('multilogue', platoTextForInit);
    }
    // 6. Function to update display based on localStorage content
    function updateDisplayState() {
        const currentPlatoText = localStorage.getItem('multilogue');
        // If there is some text.
        if (currentPlatoText && currentPlatoText.trim() !== '') {
            try {
                dialogueWrapper.innerHTML = platoTextToPlatoHtml(currentPlatoText);
            } catch (e) {
                console.error("Error rendering Plato text to HTML:", e);
                dialogueWrapper.innerHTML = "<p class='dialogue-error'>Error loading content. Please try editing or loading a new file.</p>";
            }
            dialogueWrapper.style.display = 'block';
            textarea.style.display = 'none';
            filePickerContainer.style.display = 'none';
            dialogueWrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else {
            // No valid content, show file picker
            dialogueWrapper.style.display = 'none';
            textarea.style.display = 'none';
            filePickerContainer.style.display = 'flex'; // Use flex to enable centering
            dialogueWrapper.innerHTML = ''; // Clear any old content
            textarea.value = ''; // Clear textarea
        }
    }
    // Initial display update
    updateDisplayState();
    // 7. Event listener for "Choose File" button
    chooseFileButton.addEventListener('click', async () => {
        try {
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Text Files',
                    accept: {
                        'text/plain': ['.txt', '.md', '.text', '.plato'],
                    }
                }]
            });
            const file = await fileHandle.getFile();
            const fileContent = await file.text();

            localStorage.setItem('multilogue', fileContent);
            // No need to set textarea.value here, updateDisplayState will handle if we switch to editor
            // OR, if we want to go directly to editor:
            textarea.value = fileContent;
            dialogueWrapper.style.display = 'none';
            filePickerContainer.style.display = 'none';
            textarea.style.display = 'block';
            textarea.focus();
            // If not going directly to editor, just call updateDisplayState()
            // updateDisplayState();
        } catch (err) {
            if (err.name !== 'AbortError') { // User cancelled picker
                console.error('Error opening file:', err);
                alert(`Error opening file: ${err.message}`);
            }
        }
    });
    // 8. Event listener to switch to edit mode when dialogue content is clicked
    dialogueWrapper.addEventListener('click', () => {
        try {
            // Read directly from localStorage to ensure consistency,
            // as dialogueWrapper.innerHTML might have formatting quirks.
            const plainText = localStorage.getItem('multilogue') || '';
            // Or, if conversion from current HTML is preferred:
            // const plainText = platoHtmlToPlatoText(dialogueWrapper.innerHTML);
            textarea.value = plainText;
            dialogueWrapper.style.display = 'none';
            textarea.style.display = 'block';
            filePickerContainer.style.display = 'none';
            textarea.focus();
        } catch (e) {
            console.error("Error converting HTML to Plato text for editing:", e);
            alert("Could not switch to edit mode due to a content error.");
        }
    });

    // 9. Event listener for saving (Ctrl+Enter) in the textarea (save and display)
    textarea.addEventListener('keydown', (event) => {
        if (event.ctrlKey && !event.shiftKey && event.key === 'Enter') { // Changed from Shift to Enter as per original request context
            event.preventDefault();
            const newText = textarea.value;
            localStorage.setItem('multilogue', newText);
            updateDisplayState(); // Update display, which will show dialogue or button
        }
    });

    // 11. Event listener for saving to file (Ctrl+Shift+Enter) - Always "Save As"
    document.addEventListener('keydown', async (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'Enter') {
            event.preventDefault();
            const textToSave = localStorage.getItem('multilogue') || '';

            if (!textToSave.trim()) {
                console.log('Ctrl+Shift+Enter: Dialogue content is empty. Nothing to save.');
                alert('Dialogue is empty. Nothing to save.');
                return; // Prevent saving an empty file
            }


            try {
                // Always prompt "Save As"
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'multilogue.txt', // You can customize the suggested name
                    types: [{
                        description: 'Text Files',
                        accept: {
                            'text/plain': ['.txt', '.md', '.text', '.plato'],
                        },
                    }],
                });

                // Create a FileSystemWritableFileStream to write to.
                const writable = await fileHandle.createWritable();

                // Write the contents of the file to the stream.
                await writable.write(textToSave);

                // Close the file and write the contents to disk.
                await writable.close();

                // If file save was successful, then update localStorage
                localStorage.setItem('multilogue', textToSave);
                updateDisplayState(); // Refresh the view

                // Optional: alert('Dialogue saved to file!');

            } catch (err) {
                // Handle errors, e.g., if the user cancels the save dialog
                if (err.name !== 'AbortError') {
                    console.error('Error saving file:', err);
                    alert(`Could not save file: ${err.message}`);
                }
            }
        }
    });
        // 12. Listen for storage changes to multilogue (e.g., from extension)
    window.addEventListener('storage', function(event) {
        if (event.key === 'multilogue') {
            // console.log('Page Script: localStorage.platoText changed, calling updateDisplayState.');
            // Ensure updateDisplayState is accessible here or call the relevant parts directly
            if (typeof updateDisplayState === 'function') {
                updateDisplayState();
            } else {
                console.warn('Page Script: updateDisplayState function not found globally for storage event.');
                // Fallback or direct DOM manipulation if needed, though updateDisplayState is preferred
                const currentPlatoText = localStorage.getItem('multilogue');
                if (currentPlatoText && currentPlatoText.trim() !== '') {
                    try {
                        dialogueWrapper.innerHTML = platoTextToPlatoHtml(currentPlatoText); // Assumes platoTextToPlatoHtml is global
                        dialogueWrapper.style.display = 'block';
                        textarea.style.display = 'none';
                        filePickerContainer.style.display = 'none';
                        dialogueWrapper.scrollIntoView({ behavior: 'smooth', block: 'end' });
                    } catch (e) {
                        console.error("Page Script (storage listener): Error rendering Plato text to HTML:", e);
                        dialogueWrapper.innerHTML = "<p class='dialogue-error'>Error loading content.</p>";
                    }
                } else {
                    dialogueWrapper.style.display = 'none';
                    textarea.style.display = 'none';
                    filePickerContainer.style.display = 'flex';
                    dialogueWrapper.innerHTML = '';
                    textarea.value = '';
                }
            }
        }
    });
    // 13. Update display when tab becomes visible again
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            // console.log('Page is now visible, ensuring display is up to date.');
            if (typeof updateDisplayState === 'function') {
                updateDisplayState();
            } else {
                console.warn('Page Script (visibilitychange): updateDisplayState function not found.');
            }
        }
    });
});
