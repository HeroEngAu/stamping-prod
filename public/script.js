document.addEventListener('DOMContentLoaded', () => {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const status = document.getElementById('status');
    const uploadBtn = document.getElementById('uploadBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const stamptype = document.getElementById('stype');
    const sdate = document.getElementById('date');
    const issuedto = document.getElementById('issuedto');


    let downloadUrl = '';
    let selectedStamptype = '';

    const updateIssuedToPlaceholder = (stamptype) => {
        switch (stamptype) {
            case '1':
                issuedto.placeholder = 'Issued for Client Review';
                break;
            case '2':
                issuedto.placeholder = 'Initials for Asbuilt Final';
                break;
            case '3':
                issuedto.placeholder = 'Initials for Certified for Construction';
                break;
            default:
                issuedto.placeholder = 'Issued to:';
        }
    };




    stamptype.addEventListener('change', (event) => {
        selectedStamptype = event.target.value;
        console.log(`Selected stamptype: ${selectedStamptype}`);
        updateIssuedToPlaceholder(selectedStamptype); // Update the placeholder when stamptype changes
    });



    const handleFileUpload = async (file) => {
        const sdateValue = sdate.value.trim();
        const issuedtoValue = issuedto.value.trim();
      
        if (!sdateValue || !issuedtoValue || selectedStamptype == "") {
          status.textContent = 'Please enter the date, issued to or Initals fields and select a Stamp Type';
          return;
        }
      
        const formData = new FormData();
        formData.append('file', file);
        formData.append('stamptype', selectedStamptype);
        formData.append('issuedto', issuedtoValue);
        formData.append('sdate', sdateValue);
      
        try {
          const response = await fetch('/stamping/upload', {
            method: 'POST',
            body: formData
          });
      
          if (!response.ok) {
            throw new Error('Failed to upload file');
          }
      
          const result = await response.json();
          status.textContent = `Files processed: ${result.processedFiles}`;
      
          if (result.downloadUrl) {
            downloadUrl = result.downloadUrl;
            downloadBtn.style.display = 'block';
          }
        } catch (error) {
          status.textContent = `Error: ${error.message}`;
        }
      };

    dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const files = event.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });

    dropzone.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.style.backgroundColor = '#e9ecef';
    });

    dropzone.addEventListener('dragleave', (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.style.backgroundColor = '#fff';
    });

    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', () => {
        const files = fileInput.files;
        if (files.length > 0) {
            const stamptypeValue = stamptype.value;
            handleFileUpload(files[0], stamptypeValue);
        }
    });


    downloadBtn.addEventListener('click', () => {
      if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        // Reset form fields and hide download button
        sdate.value = '';
        issuedto.value = '';
        stamptype.value = '';
        downloadBtn.style.display = 'none';
        status.textContent = '';
        dropzone.style.backgroundColor = '#fff';
      }
    });
});
